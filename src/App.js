import React, { Component } from 'react';
import Accelerometer from './Accelerometer';
import GPS from './GPS';
import Audio from './Audio';
import Marking from './Marking';

import 'bulma/css/bulma.css';
import '@fortawesome/fontawesome-free/css/all.css';

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

    this.recordedAccelerometerValues = [];
    this.recordedPositionValues = [];

    this.recordedAudioStartTimestamp = null;
    this.recordedAudioEndTimestamp = null;
    this.recordedAudioBlobs = [];
    this.fr = new FileReader();
    this.fr.addEventListener('error', (e) => {
      console.log(e);
    });
    this.counter = 0;
    this.fftOutput = [];
    // this.recordedOutput = []
    this.blobLengthMS = null;
  }

  componentDidMount() {

  }

  updateAccelerometerValues = (deviceMotionEvent) => {
    this.accelerometerValues = deviceMotionEvent;

    if (this.state.recording) {
      this.recordedAccelerometerValues.push([
        Date.now(),
        deviceMotionEvent.acceleration.x,
        deviceMotionEvent.acceleration.x,
        deviceMotionEvent.acceleration.z
      ]);
    }
  }

  updatePosition = (position) => {
    this.position = position;

    if (this.state.recording) {
      this.recordedPositionValues.push([
        Date.now(),
        position.coords.longitude,
        position.coords.latitude
      ]);
    }
  }

  newMediaRecorder = (mediaRecorder, mimeType) => {
    this.mediaRecorder = mediaRecorder;
    this.mimeType = mimeType;
    this.mediaRecorder.addEventListener('stop', this.saveRecording);
    this.mediaRecorder.addEventListener('error', (e) => {
      console.log('error in recording audio from mic');
    });
    this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
            // this.recordedAudioBlobs.push(event.data);
            this.pushNewAudioBlob(event.data, event);
        } else {
            console.log("error in recording maybe");
            console.log(event);
        }
    });
  }

  pushNewAudioBlob = (blob, event) => {
    this.recordedAudioBlobs.push(blob);
  }

  newMark = (timestamp) => {
    this.lastMark = timestamp;
    if (this.state.recording) {
      this.recordedMarks.push(timestamp);
    }
  }

  toggleRecording = () => {
    if (this.state.recording) {
      this.mediaRecorder.stop();
      this.setState({
        recording: false
      });
      // this.saveRecording();
    } else {
      this.recordedAudioBlobs = []
      this.recordedOutput = []
      this.recordedAudioStartTimestamp = Date.now();
      this.mediaRecorder.start(this.blobLengthMS);
      this.setState({
        recording: true
      });
    }
  }

  saveRecording = () => {
    this.recordedAudioEndTimestamp = Date.now();
    let lr = new Blob(this.recordedAudioBlobs, {
      type: this.mimeType
    });
    console.log(lr);
    this.setState({
      recordedAudio: lr
    }, () => {
      this.processRecording();
    });
  }

  processRecording = () => {
    var recordedAudio = this.state.recordedAudio;

    // used to read in audio as pure bytes
    this.fr.addEventListener('load', (e) => {
      console.log(e);
      console.log(this.fr.result);
      // need default audioctx for decodeAudioData method
      let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.decodeAudioData(this.fr.result, (audioBuffer) => {
        console.log(audioBuffer);
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
          // console.log(this.counter);
          // console.log(this.recordedOutput);
          // console.log(this.fftOutput);
          // console.log(this.recordedAudioBlobs);
          // console.log(this.state.recordedAudio);

          console.log(this.recordedAccelerometerValues);
          console.log(this.recordedPositionValues);
          console.log(this.recordedAudioStartTimestamp);
          console.log(this.recordedAudioEndTimestamp);
          this.createCsv();
        }
        offlineAudioCtx.startRendering();
      }, (e) => {
        console.log('error decoding audio');
        console.log(e);
      });
    });
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
          <Audio recordedAudio={this.state.recordedAudio} newMediaRecorder={this.newMediaRecorder} />
          {/*<a className="button is-danger" onClick={this.toggleRecordingAudio} href='#'>Record Audio</a>*/}
        </div>

        <div className="box">
          {/* <Audio pushNewAudioBlob={this.pushNewAudioBlob} blobLengthMS={this.blobLengthMS} recordedAudio={this.state.recordedAudio} /> */}
          <Marking newMark={this.newMark} />
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