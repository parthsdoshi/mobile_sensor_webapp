import React, { Component } from 'react';

class CB extends Component {
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
            <div id="cb">
            </div>
        );
    }
}

export default CB;