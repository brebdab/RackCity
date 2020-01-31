import { Classes, AnchorButton } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { InstanceObject, ModelObject } from "../utils";
const c2j = require('csvtojson')

interface ExportProps {
  token: string
}

export class BulkExport extends React.PureComponent<RouteComponentProps & ExportProps> {

  render() {
    return (
      <div className={Classes.DARK}>
        <p>Export</p>
      </div>
    )
  }

}


const mapStatetoProps = (state: any) => {
  return {
    token: state.token
  };
};

export default withRouter(connect(mapStatetoProps)(BulkExport));
