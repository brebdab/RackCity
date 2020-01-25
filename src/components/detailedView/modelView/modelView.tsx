import { Classes, Tab, Tabs } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";

export interface Props { rid: string };


export class modelView extends React.PureComponent<RouteComponentProps> {

  public render() {
    let params: any;
    params = this.props.match.params
    return <h1>model {params.rid}</h1>
  }

}

export default withRouter(modelView);
