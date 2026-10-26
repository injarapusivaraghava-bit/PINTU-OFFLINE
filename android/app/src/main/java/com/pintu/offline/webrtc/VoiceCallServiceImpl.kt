package com.pintu.offline.webrtc

import android.content.Context
import android.media.AudioManager
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.webrtc.*
import java.util.*

class VoiceCallServiceImpl(private val context: Context) : VoiceCallService {

    companion object {
        private const val TAG = "VoiceCallService"
    }

    private val _callStatus = MutableStateFlow(VoiceCallService.CallStatus.IDLE)
    override val callStatus: StateFlow<VoiceCallService.CallStatus> = _callStatus

    private val _callDurationSeconds = MutableStateFlow(0)
    override val callDurationSeconds: StateFlow<Int> = _callDurationSeconds

    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var audioTrack: AudioTrack? = null

    private var durationJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    init {
        initializeWebRTC()
    }

    private fun initializeWebRTC() {
        try {
            val initializationOptions = PeerConnectionFactory.InitializationOptions.builder(context)
                .createInitializationOptions()
            PeerConnectionFactory.initialize(initializationOptions)

            val options = PeerConnectionFactory.Options()
            peerConnectionFactory = PeerConnectionFactory.builder()
                .setOptions(options)
                .createPeerConnectionFactory()
                
            Log.d(TAG, "WebRTC PeerConnectionFactory initialized for local duplex VoIP.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize WebRTC engine", e)
        }
    }

    override fun startVoiceCall(peerIpAddress: String, targetPort: Int) {
        if (_callStatus.value != VoiceCallService.CallStatus.IDLE) return
        _callStatus.value = VoiceCallService.CallStatus.RINGING
        Log.i(TAG, "Dialing voice call to remote peer $peerIpAddress:$targetPort")

        scope.launch {
            try {
                createPeerConnection()
                
                // Audio Constraints
                val audioConstraints = MediaConstraints()
                val audioSource = peerConnectionFactory?.createAudioSource(audioConstraints)
                audioTrack = peerConnectionFactory?.createAudioTrack("pintu_voice_track_v1", audioSource)
                audioTrack?.setEnabled(true)

                peerConnection?.addTrack(audioTrack, listOf("pintu_audio_stream"))

                // Do not fake call answer; real WebRTC SDP signaling exchange required
                if (peerIpAddress.isBlank() || peerIpAddress == "0.0.0.0") {
                    Log.w(TAG, "Cannot initiate call: Peer IP is not bound or signaling channel is missing.")
                    _callStatus.value = VoiceCallService.CallStatus.FAILED
                } else {
                    Log.i(TAG, "WebRTC voice track created. Awaiting peer signaling answer SDP on $peerIpAddress:$targetPort...")
                    // Remains RINGING until real acceptVoiceCall or SDP answer arrives
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed initiating voice call", e)
                _callStatus.value = VoiceCallService.CallStatus.FAILED
            }
        }
    }

    override fun acceptVoiceCall() {
        if (_callStatus.value != VoiceCallService.CallStatus.RINGING) return
        _callStatus.value = VoiceCallService.CallStatus.CONNECTED
        startDurationCounter()
        Log.i(TAG, "Inbound Voice Call session accepted.")
    }

    override fun endVoiceCall() {
        if (_callStatus.value == VoiceCallService.CallStatus.IDLE) return
        _callStatus.value = VoiceCallService.CallStatus.ENDED
        
        durationJob?.cancel()
        _callDurationSeconds.value = 0

        scope.launch {
            try {
                peerConnection?.close()
                peerConnection = null
                Log.d(TAG, "Voice Call session terminated. Sockets and WebRTC resources released.")
                delay(1000)
                _callStatus.value = VoiceCallService.CallStatus.IDLE
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing WebRTC resources", e)
            }
        }
    }

    override fun toggleMicrophone(isEnabled: Boolean) {
        audioTrack?.setEnabled(isEnabled)
        Log.d(TAG, "Microphone toggle state: $isEnabled")
    }

    override fun toggleSpeakerphone(isEnabled: Boolean) {
        audioManager.isSpeakerphoneOn = isEnabled
        Log.d(TAG, "Speakerphone toggle state: $isEnabled")
    }

    private fun createPeerConnection() {
        val rtcConfig = PeerConnection.RTCConfiguration(emptyList()).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
        }

        peerConnection = peerConnectionFactory?.createPeerConnection(rtcConfig, object : PeerConnection.Observer {
            override fun onSignalingChange(state: PeerConnection.SignalingState?) {}
            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {
                if (state == PeerConnection.IceConnectionState.FAILED) {
                    _callStatus.value = VoiceCallService.CallStatus.FAILED
                }
            }
            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {}
            override fun onIceCandidate(candidate: IceCandidate?) {
                Log.v(TAG, "Local Ice Candidate gathered: ${candidate?.sdp}")
            }
            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
            override fun onAddStream(stream: MediaStream?) {}
            override fun onRemoveStream(stream: MediaStream?) {}
            override fun onDataChannel(channel: DataChannel?) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddTrack(receiver: RtpReceiver?, mediaStreams: Array<out MediaStream>?) {}
        })
    }

    private fun startDurationCounter() {
        durationJob?.cancel()
        _callDurationSeconds.value = 0
        durationJob = scope.launch {
            while (isActive) {
                delay(1000)
                _callDurationSeconds.value += 1
            }
        }
    }
}
