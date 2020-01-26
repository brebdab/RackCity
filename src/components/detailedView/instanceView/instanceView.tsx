import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import "./instanceView.scss";

export interface InstanceViewProps {
  rid: string;
}

// Given an rid, will perform a GET request of that rid and display info about that instnace

async function getData(instancekey: string) {
  return await axios
    .get("https://rack-city-dev.herokuapp.com/api/instances/" + instancekey)
    .then(res => {
      const data = res.data;
      return data;
    });
}

export class InstanceViewWrapper extends React.PureComponent<
  RouteComponentProps,
  InstanceViewProps
> {
  public render() {
    return (
      <InstanceView
        history={this.props.history}
        location={this.props.location}
        match={this.props.match}
      />
    );
  }
}

interface InstanceViewState {
  hostname: any;
  model: any;
  rack: any;
  height: any;
  user: any;
  comment: any;
}

export class InstanceView extends React.PureComponent<
  RouteComponentProps,
  InstanceViewState
> {
  public state: InstanceViewState = {
    hostname: "",
    model: "",
    rack: "",
    height: "",
    user: "",
    comment: ""
  };

  async componentDidMount() {
    const resp = await getData("2"); // TODO change to dynamic path
    this.setState({
      hostname: resp.hostname,
      model: resp.model,
      rack: resp.rack,
      height: resp.height,
      user: resp.user,
      comment: resp.comment
    });
  }

  public render() {
    // let temp: any;
    // temp = this.props.match.params
    // const rid = temp.rid
    return (
      <div className={Classes.DARK + " instance-view"}>
        <div>
          <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered">
            <thead>
              <tr>
                <th>Hostname</th>
                <th>Model</th>
                <th>Rack</th>
                <th>Rack U</th>
                <th>Owner</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{this.state.hostname}</td>
                <td>{this.state.model}</td>
                <td>{this.state.rack}</td>
                <td>{this.state.height}</td>
                <td>{this.state.user}</td>
                <td>{this.state.comment}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default withRouter(InstanceViewWrapper);
