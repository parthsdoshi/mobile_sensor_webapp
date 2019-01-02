import React, { Component } from 'react';

if (window.MediaRecorder == null) {
    // safari polyfill
    window.MediaRecorder = require('audio-recorder-polyfill');
}

class Audio extends Component {
    constructor(props) {
        super(props);

        this.state = {
            error: false,
            lastRecorded: null,
            lastRecordedUrl: null,
            mimeType: null
        }
    }

    componentDidMount() {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(this.recordAudioStream);
    }

    recordAudioStream = (stream) => {
        // requires https to work on chrome and safari
        // this.player.srcObject = stream;
        this.options = {
            // chrome likes webm
            mimeType: 'audio/webm',
        };
        if (MediaRecorder.isTypeSupported(this.options.mimeType)) {
            this.mediaRecorder = new MediaRecorder(stream, this.options);
        } else {
            // firefox only supports ogg completely
            this.options.mimeType = 'audio/ogg'
            if (MediaRecorder.isTypeSupported(this.options.mimeType)) {
                this.mediaRecorder = new MediaRecorder(stream, this.options);
            } else {
                // safari polyfill
                this.options.mimeType = 'audio/wav'
                if (MediaRecorder.isTypeSupported(this.options.mimeType)) {
                    this.mediaRecorder = new MediaRecorder(stream, this.options);
                } else {
                    this.setState({
                        error: true,
                        message: "No standard audio codec supported on this device.",
                        code: 1
                    });
                    return;
                }
            }
        }

        this.setState({
            mimeType: this.options.mimeType
        });

        this.props.newMediaRecorder(this.mediaRecorder, this.options.mimeType);

        // this.mediaRecorder.addEventListener('stop', this.save_recording);
    }

    render() {
        let recordedAudioURL = null;
        if (this.props.recordedAudio) {
            recordedAudioURL = window.URL.createObjectURL(this.props.recordedAudio);
        }
        return (
            <div id="audio">
                <h3 className="title is-3">Audio Module</h3>
                <p>
                    Recording Codec: {this.state.mimeType}
                </p>
                {this.props.recordedAudio &&
                    <div>
                        {this.state.mimeType !== 'audio/webm' &&
                            <div className='box'>
                                {/*<audio id="player" controls src={recordedAudioURL}></audio>*/}
                                <audio id="player" controls key={recordedAudioURL}>
                                    <source key={recordedAudioURL} type={this.options.mimeType} src={recordedAudioURL}></source>
                                </audio>
                            </div>
                        }
                        {this.state.mimeType === 'audio/webm' &&
                            <div className='box'>
                                {/*<video id="player" controls src={recordedAudioURL}></video>*/}
                                {/* we need video because chrome is dumb */}
                                <video id="player" controls key={recordedAudioURL}>
                                    <source key={recordedAudioURL} type={this.state.mimeType} src={recordedAudioURL}></source>
                                </video>
                            </div>
                        }
                        <a className="button is-info" href={recordedAudioURL} download={'audio.' + this.state.mimeType.split('/')[1]}>Download Audio Recording</a>
                    </div>
                }
            </div>
        );
    }
}

export default Audio;