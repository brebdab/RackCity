import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { InstanceObject } from "../utils";

export class BulkImport extends React.PureComponent<RouteComponentProps> {
  render() {
    return (
      <div className={Classes.DARK + " import"}>
        <p>BulkImport</p>
      </div>
    )
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(BulkImport));
