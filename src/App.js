import React, { Component } from 'react';
import Accelerometer from './Accelerometer';
import GPS from './GPS';
import Audio from './Audio';

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
      recordedAudio: null,
      recordedAudioURL: null,
      error: false
    };
    this.recordedAudioBlobs = [];
    this.fr = new FileReader();
    this.counter = 0;
    this.fftOutput = [];
    this.recordedOutput = []
    this.blobLengthMS = 1;
  }

  componentDidMount() {

  }

  updateAccelerometerValues = (deviceMotionEvent) => {
    this.accelerometerValues = deviceMotionEvent;
  }

  updatePosition = (position) => {
    this.position = position;
  }

  pushNewAudioBlob = (blob, event) => {
    if (this.state.recording) {
      this.recordedAudioBlobs.push(blob);
      this.recordedOutput.push([Date.now(), this.accelerometerValues, this.position]);
    }
  }

  newMediaRecorder = (mediaRecorder) => {
    this.mediaRecorder = mediaRecorder;
  }


  toggleRecording = () => {
    if (this.state.recording) {
      this.mediaRecorder.stop();
      while (this.mediaRecorder.state !== "inactive");
      this.setState({
        recording: false
      });
      this.saveRecording();
    } else {
      this.recordedAudioBlobs = []
      this.recordedOutput = []
      this.mediaRecorder.start(this.blobLengthMS);
      this.setState({
        recording: true
      });
    }
  }

  saveRecording = () => {
    let lr = new Blob(this.recordedAudioBlobs);
    this.setState({
      recordedAudio: lr
    }, () => {
      this.processRecording();
    });
  }

  processRecording = () => {
    let recordedAudio = this.state.recordedAudio;

    // used to read in audio as pure bytes
    this.fr.onloadend = () => {
      console.log(this.fr.result);
      // need default audioctx for decodeAudioData method
      let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.decodeAudioData(this.fr.result, (audioBuffer) => {
        console.log(audioBuffer);
        window.alert(audioBuffer.length);
        return;
        // if (audioBuffer.length === 0) {
        //   this.saveRecording();
        //   return;
        // }
        // window.alert(audioBuffer.duration);

        let offlineAudioCtx = null;
        if (window.OfflineAudioContext) {
          offlineAudioCtx = new window.OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
        } else if (window.webkitOfflineAudioContext) {
          // window.alert('' + audioBuffer.numberOfChannels + '\n' + audioBuffer.length + '\n' + audioBuffer.sampleRate)
          offlineAudioCtx = new window.webkitOfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
        } else {
          this.setState({
            error: true,
            errorCode: 2,
            errorMessage: "Offline Audio Context not supported by this device."
          });
        }
        let source = offlineAudioCtx.createBufferSource();
        this.analyser = offlineAudioCtx.createAnalyser();

        source.buffer = audioBuffer;
        // should give us an fft output around every .003 seconds
        // (1 / (192000/512))
        let fftSize = 2048.;
        // window.alert(audioBuffer.sampleRate);
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
        processor.onaudioprocess = this.processSample;

        // start processing the audio
        source.start();
        offlineAudioCtx.oncomplete = (renderedBuffer) => {
          console.log(this.counter);
          console.log(this.recordedOutput);
          console.log(this.fftOutput);
          console.log(this.recordedAudioBlobs);
          console.log(this.state.recordedAudio);
          this.createCsv();
        }
        offlineAudioCtx.startRendering();
      }, (e) => {
        window.alert(e.message);
      });
    }
    // calls the above callback once it's done reading in
    this.fr.readAsArrayBuffer(recordedAudio);
  }

  processSample = (e) => {
    // console.log(e);

    // should equal length (audioBuffer.length) / (analyser.fftSize)) truncated
    this.counter++;
    // console.log(this.counter);

    let bufferLength = this.analyser.frequencyBinCount;
    let dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    // console.log(dataArray);
    this.fftOutput.push(dataArray);
  }

  createCsv = () => {
    // let csvContent = "data:text/csv;charset=utf-8,";
    // this.recordedOutput.forEach((o) => {
    //   let rowArr = [];
    //   csvContent += rowArr.join(',') + '\r\n';
    // });
    // this.setState({
    //   csv: window.encodeURI(csvContent)
    // });
  }

  render() {
    return (
      <div className="App">
        {this.state.error && <h1 className="is-1 has-text-danger">ERROR</h1>}

        <div className="box">
          <Accelerometer updateAccelerometerValues={this.updateAccelerometerValues} />
          {/*<a className="button is-danger" onClick={this.toggleRecordingAccelerometer} href='#'>Record Accelerometer</a>*/}
        </div>

        <div className="box">
          <GPS updatePosition={this.updatePosition} enableHighAccuracy={true} maximumAge={0} timeout={1} />
          {/*<a className="button is-danger" onClick={this.toggleRecordingGPS} href='#'>Record GPS Coordinates</a>*/}
        </div>

        <div className="box">
          {/* <Audio pushNewAudioBlob={this.pushNewAudioBlob} blobLengthMS={this.blobLengthMS} recordedAudio={this.state.recordedAudio} /> */}
          <Audio pushNewAudioBlob={this.pushNewAudioBlob} blobLengthMS={this.blobLengthMS} recordedAudio={this.state.recordedAudio} newMediaRecorder={this.newMediaRecorder} />
          {/*<a className="button is-danger" onClick={this.toggleRecordingAudio} href='#'>Record Audio</a>*/}
        </div>

        <div className="box">
          <h3 className="title is-3">Record All Sensors</h3>
          <button className="button is-danger" onClick={this.toggleRecording}>{(!this.state.recording && 'Start') || (this.state.recording && 'Stop')} Recording</button>
          {/*this.mediaRecorder && this.mediaRecorder.mimeType*/}
          {/*this.state.recordedAudioURL*/}
          {this.state.recordedAudio != null && <div>
            <a className="button is-info" href={this.state.csv} download="results.csv">Download csv of all sensor data</a>
          </div>}
        </div>
      </div>
    );
  }
}

export default App;