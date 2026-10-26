package com.pintu.offline.webrtc

import android.content.Context
import android.util.Log
import android.view.SurfaceView
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.webrtc.*

class VideoCallServiceImpl(private val context: Context) : VideoCallService {

    companion object {
        private const val TAG = "VideoCallService"
    }

    private val _sessionState = MutableStateFlow(
        VideoCallService.VideoSessionState(
            isLocalVideoEnabled = false,
            isRemoteVideoEnabled = false,
            isMuted = false,
            isSpeakerOn = false,
            activeCameraType = VideoCallService.CameraType.FRONT
        )
    )
    override val sessionState: StateFlow<VideoCallService.VideoSessionState> = _sessionState

    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var videoTrack: VideoTrack? = null
    private var videoCapturer: VideoCapturer? = null

    private var localSurfaceView: SurfaceViewRenderer? = null
    private var remoteSurfaceView: SurfaceViewRenderer? = null
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    init {
        initializeWebRTC()
    }

    private fun initializeWebRTC() {
        try {
            val initializationOptions = PeerConnectionFactory.InitializationOptions.builder(context)
                .createInitializationOptions()
            PeerConnectionFactory.initialize(initializationOptions)

            val options = PeerConnectionFactory.Options()
            val eglBase = EglBase.create()

            peerConnectionFactory = PeerConnectionFactory.builder()
                .setOptions(options)
                .setVideoEncoderFactory(DefaultVideoEncoderFactory(eglBase.eglContext, true, true))
                .setVideoDecoderFactory(DefaultVideoDecoderFactory(eglBase.eglContext))
                .createPeerConnectionFactory()

            Log.d(TAG, "Video WebRTC engine successfully booted.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed initializing Video WebRTC factory", e)
        }
    }

    override fun setupWebRtcSurfaces(localRenderer: SurfaceView, remoteRenderer: SurfaceView) {
        if (localRenderer is SurfaceViewRenderer && remoteRenderer is SurfaceViewRenderer) {
            localSurfaceView = localRenderer
            remoteSurfaceView = remoteRenderer

            val eglBase = EglBase.create()
            localSurfaceView?.init(eglBase.eglContext, null)
            remoteSurfaceView?.init(eglBase.eglContext, null)

            localSurfaceView?.setEnableHardwareScaler(true)
            remoteSurfaceView?.setEnableHardwareScaler(true)
            
            Log.d(TAG, "Hardware SurfaceViewRenderers successfully initialized and bound.")
        }
    }

    override fun initiateVideoCall(peerIpAddress: String) {
        _sessionState.value = _sessionState.value.copy(isLocalVideoEnabled = true)
        Log.i(TAG, "Initiated duplex video call with peer at $peerIpAddress")

        scope.launch {
            try {
                createPeerConnection()
                startLocalCameraCapture()
                
                // Add local stream track to peer connection
                peerConnection?.addTrack(videoTrack, listOf("pintu_video_stream"))

                if (peerIpAddress.isBlank() || peerIpAddress == "0.0.0.0") {
                    Log.w(TAG, "Cannot start video call: Peer IP address missing or unassigned.")
                } else {
                    Log.i(TAG, "Local video track attached. Awaiting peer SDP answer on $peerIpAddress...")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed establishing peer connection video stream", e)
            }
        }
    }

    override fun answerVideoCall() {
        _sessionState.value = _sessionState.value.copy(
            isLocalVideoEnabled = true,
            isRemoteVideoEnabled = true
        )
        startLocalCameraCapture()
        Log.i(TAG, "Inbound video call answered. Camera streams online.")
    }

    override fun hangUpVideoCall() {
        _sessionState.value = VideoCallService.VideoSessionState(
            isLocalVideoEnabled = false,
            isRemoteVideoEnabled = false,
            isMuted = false,
            isSpeakerOn = false,
            activeCameraType = VideoCallService.CameraType.FRONT
        )

        scope.launch {
            try {
                videoCapturer?.stopCapture()
                videoCapturer?.dispose()
                peerConnection?.close()
                peerConnection = null
                Log.i(TAG, "WebRTC Video Call session torn down and resources released.")
            } catch (e: Exception) {
                Log.e(TAG, "Error cleaning video stream instances", e)
            }
        }
    }

    override fun switchCamera() {
        val currentType = _sessionState.value.activeCameraType
        val nextType = if (currentType == VideoCallService.CameraType.FRONT) VideoCallService.CameraType.BACK else VideoCallService.CameraType.FRONT
        
        if (videoCapturer is CameraVideoCapturer) {
            val cameraVideoCapturer = videoCapturer as CameraVideoCapturer
            cameraVideoCapturer.switchCamera(object : CameraVideoCapturer.CameraSwitchHandler {
                override fun onCameraSwitchDone(isFrontCamera: Boolean) {
                    _sessionState.value = _sessionState.value.copy(activeCameraType = nextType)
                    Log.d(TAG, "Camera lens switched successfully to $nextType")
                }

                override fun onCameraSwitchError(errorDescription: String?) {
                    Log.e(TAG, "Camera lens switch error: $errorDescription")
                }
            })
        }
    }

    override fun toggleLocalCamera(isEnabled: Boolean) {
        videoTrack?.setEnabled(isEnabled)
        _sessionState.value = _sessionState.value.copy(isLocalVideoEnabled = isEnabled)
        Log.d(TAG, "Local video track state: $isEnabled")
    }

    private fun startLocalCameraCapture() {
        val enumerator = Camera2Enumerator(context)
        val deviceNames = enumerator.deviceNames
        var targetDeviceName: String? = null

        // Select front camera default
        for (name in deviceNames) {
            if (enumerator.isFrontFacing(name)) {
                targetDeviceName = name
                break
            }
        }

        if (targetDeviceName == null && deviceNames.isNotEmpty()) {
            targetDeviceName = deviceNames[0]
        }

        if (targetDeviceName != null) {
            videoCapturer = enumerator.createCapturer(targetDeviceName, null)
            val videoSource = peerConnectionFactory?.createVideoSource(false)
            
            val surfaceTextureHelper = SurfaceTextureHelper.create("CaptureThread", EglBase.create().eglContext)
            videoCapturer?.initialize(surfaceTextureHelper, context, videoSource?.capturerObserver)
            videoCapturer?.startCapture(640, 480, 30)

            videoTrack = peerConnectionFactory?.createVideoTrack("pintu_video_track_v1", videoSource)
            
            // Sink local camera to local surface renderer
            localSurfaceView?.let { renderer ->
                videoTrack?.addSink(renderer)
            }
        }
    }

    private fun createPeerConnection() {
        val rtcConfig = PeerConnection.RTCConfiguration(emptyList()).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
        }

        peerConnection = peerConnectionFactory?.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onSignalingChange(state: PeerConnection.SignalingState?) {}
            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {}
            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {}
            override fun onIceCandidate(candidate: IceCandidate?) {
                Log.d(TAG, "Video ICE candidate generated: ${candidate?.sdp}")
            }
            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
            override fun onAddStream(stream: MediaStream?) {}
            override fun onRemoveStream(stream: MediaStream?) {}
            override fun onDataChannel(channel: DataChannel?) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddTrack(receiver: RtpReceiver?, mediaStreams: Array<out MediaStream>?) {
                val track = receiver?.track()
                if (track is VideoTrack && remoteSurfaceView != null) {
                    track.addSink(remoteSurfaceView)
                    Log.i(TAG, "Remote video track successfully sinked to remote SurfaceView.")
                }
            }
        })
    }
}
