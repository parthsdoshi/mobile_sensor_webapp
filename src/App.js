import React, { Component } from 'react';
import Accelerometer from './Accelerometer';
import GPS from './GPS';

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
      mic: null,
      recording: false,
      last_recorded: null,
      last_recorded_url: null,
      longitude: null,
      latitude: null,
      error: false
    };
    this.recorded_audio_blobs = [];
    this.fr = new FileReader();
    this.counter = 0;
    this.fftOutput = [];
    this.recordedOutput = []
  }

  setAccelerometerValues = (deviceMotionEvent) => {
    this.accelerometerValues = deviceMotionEvent;
  }

  setPosition = (position) => {
    this.position = position;
  }

  process_audio = (e) => {
    // console.log(e);

    // should equal length (audioBuffer.length) / (analyser.fftSize)) truncated
    this.counter++;
    // console.log(this.counter);

    let bufferLength = this.analyser.frequencyBinCount;
    let dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    // console.log(dataArray);
    this.fftOutput.push(dataArray);
    this.recordedOutput.push({
      fft: dataArray,
      accelerometer: {
        x: this.state.dme.acceleration.x,
        y: this.state.dme.acceleration.y,
        z: this.state.dme.acceleration.z
      },
      coords: {
        latitude: this.state.latitude,
        longitude: this.state.longitude
      }
    });
  }

  createCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    this.recordedOutput.forEach((o) => {
      let rowArr = [];
      rowArr = rowArr.concat(o.fft);
      rowArr.push(o.accelerometer.x);
      rowArr.push(o.accelerometer.y);
      rowArr.push(o.accelerometer.z);
      rowArr.push(o.coords.latitude);
      rowArr.push(o.coords.longitude);
      csvContent += rowArr.join(',') + '\r\n';
    });
    this.setState({
      csv: window.encodeURI(csvContent)
    });
  }

  save_recording = () => {
    let lr = new Blob(this.recorded_audio_blobs);
    let lru = window.URL.createObjectURL(lr);
    this.setState({
      last_recorded: lr,
      last_recorded_url: lru
    });

    // used to read in audio as pure bytes
    this.fr.onloadend = () => {
      // need default audioctx for decodeAudioData method
      let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.decodeAudioData(this.fr.result, (audioBuffer) => {
        console.log(audioBuffer);

        let offlineAudioCtx = null;
        if (window.OfflineAudioContext) {
          offlineAudioCtx = new window.OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate)
        } else if (window.webkitOfflineAudioContext) {
          offlineAudioCtx = new window.webkitOfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate)
        } else {
          this.setState({
            error: true
          });
        }
        let source = offlineAudioCtx.createBufferSource();
        this.analyser = offlineAudioCtx.createAnalyser();

        source.buffer = audioBuffer;
        // should give us an fft output around every .003 seconds
        // (1 / (192000/512))
        let fftSize = 2048.;
        window.alert(audioBuffer.sampleRate);
        while ((1. / (audioBuffer.sampleRate / fftSize)) >= 0.003) {
          if (fftSize === 512.) {
            break;
          }
          fftSize = fftSize / 2;
        }
        this.analyser.fftSize = fftSize;
        console.log(this.analyser);

        // needs to be created after analyser is initialized
        let processor = offlineAudioCtx.createScriptProcessor(this.analyser.fftSize, audioBuffer.numberOfChannels, audioBuffer.numberOfChannels);

        // connect the audio nodes together
        source.connect(this.analyser);
        this.analyser.connect(processor);
        processor.connect(offlineAudioCtx.destination);

        // every call means fftSize amount of values have been played and ready to be evaluated by fft
        processor.onaudioprocess = this.process_audio;

        // start processing the audio
        source.start();
        offlineAudioCtx.oncomplete = (renderedBuffer) => {
          console.log(this.counter);
          console.log(this.recordedOutput);
          this.createCsv();
        }
        offlineAudioCtx.startRendering();
      });
    }
    // calls the above callback once it's done reading in
    this.fr.readAsArrayBuffer(lr);
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

  componentDidMount() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(this.audio_stream);
  }

  toggle_recording = () => {
    if (this.state.recording) {
      this.mediaRecorder.stop();
      this.setState({
        recording: false
      });
    } else {
      this.recorded_audio_blobs = []
      this.mediaRecorder.start(3);
      this.setState({
        recording: true
      });
    }
  }

  render() {
    return (
      <div className="App">
        {this.state.error && <h1 className="is-1 has-text-danger">ERROR</h1>}

        <div className="box">
          <Accelerometer setAccelerometerValues={this.setAccelerometerValues} />
        </div>

        <div className="box">
          <GPS setPosition={this.setPosition} enableHighAccuracy={true} maximumAge={0} timeout={1} />
        </div>

        <div className="box">
          <h3 className="title is-3">Record All Sensors</h3>
          <a className="button is-danger" onClick={this.toggle_recording} href='#'>{(!this.state.recording && 'Start') || (this.state.recording && 'Stop')} Recording</a>
          {/*this.mediaRecorder && this.mediaRecorder.mimeType*/}
          {/*this.state.last_recorded_url*/}
          {this.state.last_recorded != null && <div>
            <div className='box'>
              <h4 className="title is-4">Audio Data</h4>
              {this.options.mimeType !== 'audio/webm' &&
                <div className='box'>
                  {/*<audio id="player" controls src={this.state.last_recorded_url}></audio>*/}
                  <audio id="player" controls key={this.state.last_recorded_url}>
                    <source key={this.state.last_recorded_url} type={this.options.mimeType} src={this.state.last_recorded_url}></source>
                  </audio>
                </div>
              }
              {this.options.mimeType === 'audio/webm' &&
                <div className='box'>
                  {/*<video id="player" controls src={this.state.last_recorded_url}></video>*/}
                  <video id="player" controls key={this.state.last_recorded_url}>
                    <source key={this.state.last_recorded_url} type={this.options.mimeType} src={this.state.last_recorded_url}></source>
                  </video>
                </div>
              }
              {this.state.last_recorded != null &&
                <a className="button is-info" href={this.state.last_recorded_url} download={'audio.' + this.options.mimeType.split('/')[1]}>Download Last Audio Recording</a>
              }
            </div>
            <a className="button is-info" href={this.state.csv} download="results.csv">Download csv of all sensor data</a>
          </div>}
        </div>
      </div>
    );
  }
}

export default App;