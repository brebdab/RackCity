import { Alert, AnchorButton, Classes, Tab, Tabs } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../api-config";
import { ElementType, ModelObject } from "../utils";

interface ModifierProps {
  token: string,
  models?: Array<ModelObject>
}

export class Modifier extends React.PureComponent<RouteComponentProps & ModifierProps> {
  render() {
    if (this.props.models !== undefined) {
      console.log(this.props.models[0])
      return <p>  </p>
    } else {
      return <p>No data</p>
    }
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
  };
};

export default withRouter(connect(mapStatetoProps)(Modifier));
