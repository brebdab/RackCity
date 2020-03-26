import {
  Alert,
  Classes,
  Intent,
  IToastProps,
  Position,
  Toaster,
  Spinner
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../../../utils/api-config";
import { getHeaders, ROUTES } from "../../../../utils/utils";
// import "./barcodeView.scss";

export interface BarcodeViewProps {
  token: string;
  isAdmin: string;
  assets_numbers: Array<string>; // Asset numbers to generate barcodes from
  loading: boolean;
}

/* <Barcode
              value="100000"
              text="Hyposoft 100000"
              text-align="left"
              font-size={10}
            /> */

export interface BarcodeViewState {}

class BarcodeView extends React.PureComponent<
  RouteComponentProps & BarcodeViewProps,
  BarcodeViewState
> {
  public render() {
    return <p></p>;
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default connect(mapStatetoProps)(withRouter(BarcodeView));
