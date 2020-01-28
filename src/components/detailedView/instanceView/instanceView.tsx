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
    .get(API_ROOT + "api/instances" + instancekey, headers)
    .then(res => {
      const data = res.data;
      return data;
    });
}

// interface InstanceViewState {
//   hostname: any;
//   model: any;
//   rack: any;
//   height: any;
//   user: any;
//   comment: any;
// }

export class InstanceView extends React.PureComponent<
  RouteComponentProps & InstanceViewProps,
  InstanceObject
> {

  public state = { instance: InstanceObject }

  async componentDidMount() {
    const resp = await getData("2", ""); // TODO change to dynamic path
    this.setState({
      hostname: resp.hostname,
      elevation: resp.elevation,
      model: resp.model,
      rack: resp.rack,
      owner: resp.owner,
      comment: resp.comment
    });
  }

  public render() {
    return (
      <div className={Classes.DARK + " instance-view"}>
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
