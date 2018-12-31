import React, { Component } from 'react';

class GPS extends Component {
    constructor(props) {
        super(props);

        this.state = {
            error: false,
            errorCode: null,
            errorMessage: null,
            position: {
                coords: {
                    longitude: null,
                    latitude: null
                }
            }
        }
    }

    componentDidMount() {
        if (navigator.geolocation != null) {
            navigator.geolocation.watchPosition(this.updatePosition, this.positionError, {
                enableHighAccuracy: this.props.enableHighAccuracy,
                maximumAge: this.props.maximumAge,
                timeout: this.props.timeout
            });
        }
    }

    updatePosition = (position) => {
        this.setState({
            position: position
        });
        this.props.updatePosition(position);
    }

    positionError = (err) => {
        console.log(err);
        this.setState({
            error: true,
            errorCode: err.code,
            errorMessage: err.message
        });
    }

    render() {
        return (
            <div id="gps">
                <h3 className="title is-3">GPS Coordinates</h3>
                <p>
                    longitude: {this.state.position.coords.longitude}
                </p>
                <p>
                    latitude: {this.state.position.coords.latitude}
                </p>
                {this.state.error &&
                    <h4 className="has-text-danger">
                        Error Occurred: {'Error Code ' + this.state.errorCode + ': ' + this.state.errorMessage}
                    </h4>
                }
            </div>
        );
    }
}

export default GPS;