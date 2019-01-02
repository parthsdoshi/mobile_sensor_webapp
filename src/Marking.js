import React, { Component } from 'react';

class Marking extends Component {
    constructor(props) {
        super(props);

        this.state = {
            error: false,
            lastMark: null
        }
    }

    mark = () => {
        let timestamp = Date.now();
        this.props.newMark(timestamp);
        this.setState({
            lastMark: timestamp
        });
    }

    render() {
        return (
            <div id="marking">
                <h3 className="title is-3">Marking Module</h3>
                <p>Marks points in recording data while recording all sensors.</p>
                {this.state.lastMark && <p>Last Mark: {(new Date(this.state.lastMark)).toString()}</p>}
                {!this.state.lastMark && <p>No marks recorded yet.</p>}
                <button className="button is-warning" onClick={this.mark}>Mark</button>
            </div>
        );
    }
}

export default Marking;