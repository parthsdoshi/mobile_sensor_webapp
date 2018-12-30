import React, { Component } from 'react';
import 'bulma/css/bulma.css';
import '@fortawesome/fontawesome-free/css/all.css';

if (window.MediaRecorder == null) {
  // safari polyfill
  window.MediaRecorder = require('audio-recorder-polyfill');
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dme: null,
      mic: null,
      gps: null,
      recording: false,
      last_recorded: null,
      last_recorded_url: null,
      longitude: null,
      latitude: null
    };
    this.recorded_audio_blobs = [];
  }

  odm = (event) => {
    this.setState({
      dme: event
    });
  }

  save_recording = () => {
    console.log(this.recorded_audio_blobs);
    let lr = new Blob(this.recorded_audio_blobs);
    let lru = window.URL.createObjectURL(lr);
    this.setState({
      last_recorded: lr,
      last_recorded_url: lru
    });
  }

  audio_stream = (stream) => {
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
          console.log("Recording audio is not supported on this device.")
          return;
        }
      }
    }

    this.mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        this.recorded_audio_blobs.push(event.data);
      } else {
        console.log("error in recording maybe");
        console.log(event);
      }
    });
    this.mediaRecorder.addEventListener('stop', this.save_recording);
  }

  update_position = (position) => {
    this.setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    });
  }

  position_error = (err) => {
    console.log(err);
  }

  componentDidMount() {
    window.ondevicemotion = this.odm
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(this.audio_stream);
    
    if (navigator.geolocation != null) {
      navigator.geolocation.watchPosition(this.update_position, this.position_error, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 1
      })
    }
  }

  toggle_recording = () => {
    if (this.state.recording) {
      this.mediaRecorder.stop();
      this.setState({
        recording: false
      });
    } else {
      this.recorded_audio_blobs = []
      this.mediaRecorder.start();
      this.setState({
        recording: true
      });
    }
  }

  render() {
    return (
      <div className="App">
        <div className="box">
          <p>
            {/* not standard ios uses seconds and windows/android uses milliseconds */}
            interval for accel: {this.state.dme && this.state.dme.interval}
          </p>
          <p>
            x: {this.state.dme && this.state.dme.acceleration.x}
          </p>
          <p>
            y: {this.state.dme && this.state.dme.acceleration.y}
          </p>
          <p>
            z: {this.state.dme && this.state.dme.acceleration.z}
          </p>
        </div>

        <div className="box">
            <p>
              longitude: {this.state.longitude}
            </p>
            <p>
              latitude: {this.state.latitude}
            </p>
        </div>

        <div className="box">
          <a className="button is-danger" onClick={this.toggle_recording} href='#'>{(!this.state.recording && 'Start') || (this.state.recording && 'Stop')} Recording</a>
          {/*this.mediaRecorder && this.mediaRecorder.mimeType*/}
          {/*this.state.last_recorded_url*/}
          {this.state.last_recorded != null && this.options.mimeType !== 'audio/webm' &&
            <div className='box'>
              {/*<audio id="player" controls src={this.state.last_recorded_url}></audio>*/}
              <audio id="player" controls key={this.state.last_recorded_url}>
                <source key={this.state.last_recorded_url} type={this.options.mimeType} src={this.state.last_recorded_url}></source>
              </audio>
            </div>
          }
          {this.state.last_recorded != null && this.options.mimeType === 'audio/webm' &&
            <div className='box'>
              {/*<video id="player" controls src={this.state.last_recorded_url}></video>*/}
              <video id="player" controls key={this.state.last_recorded_url}>
                <source key={this.state.last_recorded_url} type={this.options.mimeType} src={this.state.last_recorded_url}></source>
              </video>
            </div>
          }
          {this.state.last_recorded != null &&
            <a className="button is-info" href={this.state.last_recorded_url} download={'audio.' + this.options.mimeType.split('/')[1]}>Download last recording</a>
          }
        </div>
      </div>
    );
  }
}

export default App;