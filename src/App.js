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
      error: false,
      csv: null
    };

    this.accelerometerValues = {
      acceleration: {
        x: null,
        y: null,
        z: null
      }
    };

    this.position = {
      coords: {
        latitude: null,
        longitude: null
      }
    };

    this.reset();
    this.blobLengthMS = null;
  }

  componentDidMount() {

  }

  reset = () => {
    this.recordedAccelerometerValues = [];
    this.recordedPositionValues = [];
    this.recordedMarks = [];

    this.recordedAudioBlobs = [];
    this.recordedOutput = [];
    this.fftOutput = [];
    this.recordedAudioStartTimestamp = null;
    this.recordedAudioEndTimestamp = null;
    this.csv = null;
    this.csvBlob = null;

    this.fr = new FileReader();
    this.fr.addEventListener('error', (e) => {
      console.log(e);
    });
    this.counter = 0;

    this.lastMark = null;
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
            this.pushNewAudioBlob(event.data, event);
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

  updateMarkError = (side, error) => {
    if (side === "left") {
      this.markLeftError = error;
    } else if (side === "right") {
      this.markRightError = error;
    }
  }

  toggleRecording = () => {
    if (this.state.recording) {
      this.mediaRecorder.stop();
      this.setState({
        recording: false
      });
      // below is now called by the mediaRecorder onstop event which is set during this.newMediaRecorder();
      // this.saveRecording();
    } else {
      this.reset();

      this.setState({
        recordedAudio: null,
        recordedAudioURL: null,
        csv: null
      });

      let timestamp = Date.now();
      this.recordedAudioStartTimestamp = timestamp;

      this.recordedAccelerometerValues.push([
        timestamp,
        this.accelerometerValues.acceleration.x,
        this.accelerometerValues.acceleration.y,
        this.accelerometerValues.acceleration.z
      ]);
      this.recordedPositionValues.push([
        timestamp,
        this.position.coords.longitude,
        this.position.coords.latitude
      ]);

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
    this.setState({
      recordedAudio: lr
    });
    this.processRecording(lr);
  }

  processRecording = (recordedAudio) => {
    // var recordedAudio = this.state.recordedAudio;

    // used to read in audio as pure bytes
    this.fr.addEventListener('load', (e) => {
      // need default audioctx for decodeAudioData method
      let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.decodeAudioData(this.fr.result, (audioBuffer) => {
        // console.log(audioBuffer);

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
        while ((1. / (audioBuffer.sampleRate / fftSize)) >= 0.003) {
          if (fftSize === 512.) {
            break;
          }
          fftSize = fftSize / 2;
        }
        this.analyser.fftSize = fftSize;
        // console.log(this.analyser);

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
          // console.log(this.recordedAccelerometerValues);
          // console.log(this.recordedPositionValues);
          // console.log(this.recordedAudioStartTimestamp);
          // console.log(this.recordedAudioEndTimestamp);
          // console.log(this.fftOutput);
          this.formatData(
            this.recordedAccelerometerValues,
            this.recordedPositionValues,
            this.fftOutput,
            this.recordedMarks,
            this.recordedAudioStartTimestamp,
            this.recordedAudioEndTimestamp
          );
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

  formatData = (accelerometerValues, positionValues, audioFFTValues, markedValues, startTimestamp, endTimestamp) => {
    let numberOfMS = endTimestamp - startTimestamp;

    let fftRatio = parseFloat(numberOfMS) / parseFloat(audioFFTValues.length);

    let formattedData = [];

    let accelIndex = 0;
    let positionIndex = 0;
    let audioFFTIndex = 0;
    let audioFFTUntil = fftRatio;

    this.labels = [
        'timestamp_ms',
        'acceleration_x',
        'acceleration_y',
        'acceleration_z',
        'latitude',
        'longitude'
      ];
    for (let i = 0; i < audioFFTValues[0].length; i++) {
      this.labels.push('FFT_bin_' + (i + 1));
    }
    this.labels.push('marked');

    for (let i = 0; i < numberOfMS; i++) {
      let currentTimestamp = startTimestamp + i;

      let accelerometerValue = accelerometerValues[accelIndex];
      let positionValue = positionValues[positionIndex];
      let audioFFTValue = audioFFTValues[audioFFTIndex];

      formattedData.push([
        currentTimestamp,
        ...accelerometerValue.slice(1),
        ...positionValue.slice(1),
        ...audioFFTValue,
        0
      ]);

      let nextTimestamp = currentTimestamp + 1;

      // for the following to work we should fast forward index in case...

      if (accelIndex < accelerometerValues.length - 1) {
        if (accelerometerValue[accelIndex + 1][0] <= nextTimestamp) {
          accelIndex++;
        }
      }

      if (positionIndex < positionValues.length - 1) {
        if (positionValue[positionIndex + 1][0] <= nextTimestamp) {
          positionIndex++;
        }
      }

      if (i >= parseInt(audioFFTUntil)) {
        audioFFTUntil += fftRatio;
        audioFFTIndex++;
      }
    }

    for (let markTimestamp of markedValues) {
      let mark = markTimestamp - startTimestamp;

      let leftMark = mark - this.markLeftError;
      if (leftMark < 0) {
        leftMark = 0;
      }

      let rightMark = mark + this.markRightError;
      if (rightMark >= formattedData.length) {
        rightMark = formattedData.length - 1;
      }

      for (let i = leftMark; i <= rightMark; i++) {
        formattedData[i][this.labels.length - 1] = 1;
      }
    }

    this.formattedData = formattedData;

    this.createCSV(this.formattedData, this.labels);
  }

  createCSV = (formattedData, labels) => {
    // let csvContent = "data:text/csv;charset=utf-8,";
    let csvContent = "";

    csvContent += labels.join(',') + '\r\n';

    formattedData.forEach((arr) => {
      csvContent += arr.join(',') + '\r\n';
    });

    this.csv = csvContent;
    this.csvBlob = new Blob([this.csv], {
      type: 'text/csv'
    });

    this.setState({
      csv: window.URL.createObjectURL(this.csvBlob)
    });
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
          <Audio recordedAudio={this.state.recordedAudio} newMediaRecorder={this.newMediaRecorder} />
          {/*<a className="button is-danger" onClick={this.toggleRecordingAudio} href='#'>Record Audio</a>*/}
        </div>

        <div className="box">
          <Marking newMark={this.newMark} updateError={this.updateMarkError} errorDisabled={this.state.recording} />
          {/*<a className="button is-danger" onClick={this.toggleRecordingAudio} href='#'>Record Audio</a>*/}
        </div>

        <div className="box">
          <h3 className="title is-3">Record All Sensors</h3>
          <button className="button is-danger" onClick={this.toggleRecording}>{(!this.state.recording && 'Start') || (this.state.recording && 'Stop')} Recording</button>
          {this.state.csv != null && <div>
            <a className="button is-info" href={this.state.csv} download="results.csv">Download csv of all sensor data</a>
          </div>}
        </div>
      </div>
    );
  }
}

export default App;