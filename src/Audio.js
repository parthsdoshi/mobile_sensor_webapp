import React, { Component } from 'react';

class Audio extends Component {
    constructor(props) {
        super(props);

        this.state = {
            error: false
        }
    }

    componentWillMount() {

    }

    render() {
        return (
            <div id="audio">
            </div>
        );
    }
}

export default Audio;