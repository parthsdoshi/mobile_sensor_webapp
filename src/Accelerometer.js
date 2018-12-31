import React, { Component } from 'react';

class Accelerometer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            dme: {
                acceleration: {
                    x: null,
                    y: null,
                    z: null
                },
                interval: null
            },
            error: false
        }
    }

    componentWillMount() {
        window.ondevicemotion = this.onDeviceMotion
    }

    onDeviceMotion = (event) => {
        this.setState({
            dme: event
        });
        this.props.setAccelerometerValues(event);
    }

    render() {
        return (
            <div id="accelerometer">
                <h3 className="title is-3">Accelerometer</h3>
                <p>
                    {/* not standard ios uses seconds and windows/android uses milliseconds */}
                    interval for accel: {this.state.dme.interval}
                </p>
                <p>
                    x: {this.state.dme.acceleration.x}
                </p>
                <p>
                    y: {this.state.dme.acceleration.y}
                </p>
                <p>
                    z: {this.state.dme.acceleration.z}
                </p>
            </div>
        );
    }
}

export default Accelerometer;