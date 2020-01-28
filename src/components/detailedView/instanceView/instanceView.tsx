import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../api-config";
import PropertiesView from "../propertiesView";
import { RouteComponentProps, withRouter } from "react-router";
import "./instanceView.scss";
import { connect } from "react-redux"
import { InstanceObject } from "../../utils"

export interface InstanceViewProps {
  token: string;
  rid: any;
}
// Given an rid, will perform a GET request of that rid and display info about that instnace

async function getData(instancekey: string, token: string) {
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  }
  return await axios
    .get(API_ROOT + "api/instances/" + instancekey, headers)
    .then(res => {
      const data = res.data;
      return data;
    });
}

interface InstanceViewState {
  state: InstanceObject | undefined,
  columns: Array<string>,
  fields: Array<string>
}

export class InstanceView extends React.PureComponent<
  RouteComponentProps & InstanceViewProps,
  InstanceViewState
> {

  public state: InstanceViewState = {
    state: undefined,
    columns: ["Hostname", "Model", "Rack", "Elevation", "Owner"],
    fields: ["hostname", "model", "rack", "elevation", "owner"]
  }

  public render() {
    let params: any;
    params = this.props.match.params;
    if (this.state.state === undefined){
      getData(params.rid, this.props.token).then((result) => {
        this.setState({
          state: result
        })
      })
    }
    return (
      <div className={Classes.DARK + " instance-view"}>
        <PropertiesView
          history={this.props.history} location={this.props.location}
          match={this.props.match} data={this.state.state} {...this.state}
        />
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(InstanceView));
