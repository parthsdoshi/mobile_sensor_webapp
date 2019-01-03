import React, { Component } from 'react';

class Marking extends Component {
    constructor(props) {
        super(props);

        this.state = {
            error: false,
            lastMark: null,
            leftError: 60,
            rightError: 60
        }

        this.props.updateError('left', this.state.leftError);
        this.props.updateError('right', this.state.rightError);
    }

    updateLeftError = (event) => {
        let newValue = event.target.value;
        this.setState({
            leftError: newValue
        });
        if (newValue !== "NaN") {
            this.props.updateError('left', parseInt(newValue));
        }
    }

    updateRightError = (event) => {
        let newValue = event.target.value;
        this.setState({
            rightError: newValue
        });
        if (newValue !== "NaN") {
            this.props.updateError('right', parseInt(newValue));
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

                <div>
                    <div>Mark Left Error: </div>
                    <input className="input" type="number" step="1" placeholder="Leftwards Error" value={this.state.leftError} onChange={this.updateLeftError} disabled={this.props.errorDisabled} />
                </div>
                <div>
                    <div>Mark Right Error: </div>
                    <input className="input" type="number" step="1" placeholder="Rightwards Error" value={this.state.rightError} onChange={this.updateRightError} disabled={this.props.errorDisabled} />
                </div>

                {this.state.lastMark && <p>Last Mark: {(new Date(this.state.lastMark)).toString()}</p>}
                {!this.state.lastMark && <p>No marks recorded yet.</p>}
                <button className="button is-warning" onClick={this.mark}>Mark</button>
            </div>
        );
    }
}

export default Marking;