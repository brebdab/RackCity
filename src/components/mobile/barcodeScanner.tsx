import {
  Alert,
  AnchorButton,
  Callout,
  Classes,
  Intent,
  IToastProps,
  Position,
  Toaster
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../utils/api-config";
import {
  AssetObject,
  ElementType,
  getHeaders,
  NetworkConnection,
  Node,
  DatacenterObject,
  ROUTES
} from "../../utils/utils";
import PropertiesView from "../elementView/detailedView/propertiesView";
import DecommissionedPropertiesView from "../elementView/detailedView/decommissionedPropertiesView";
// import "./assetView.scss";
import NetworkGraph from "../elementView/detailedView/assetView/graph";
import PowerView from "../elementView/powerView/powerView";
import { isNullOrUndefined } from "util";

interface BarcodeScannerState {}
interface BarcodeScannerProps {
  token: string;
  isMobile: boolean;
}

export class BarcodeScanner extends React.PureComponent<
  RouteComponentProps & BarcodeScannerProps,
  BarcodeScannerState
> {
  render() {
    return (
      <div className={Classes.DARK}>
        <p>Scanner</p>
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isMobile: state.isMobile
  };
};

export default withRouter(connect(mapStatetoProps)(BarcodeScanner));
