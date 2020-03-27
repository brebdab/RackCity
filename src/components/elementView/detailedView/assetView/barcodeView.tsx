import { Classes, Position } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
// import { API_ROOT } from "../../../../utils/api-config";
// import { getHeaders, ROUTES } from "../../../../utils/utils";
import Barcode from "react-barcode";
import ReactDOMServer from "react-dom/server";
// import "./barcodeView.scss";

export interface BarcodeViewProps {
  token: string;
  isAdmin: string;
  assets_numbers: Array<string>; // Asset numbers to generate barcodes from
  loading: boolean;
}

export interface BarcodeViewState {}

class BarcodeView extends React.PureComponent<
  RouteComponentProps & BarcodeViewProps,
  BarcodeViewState
> {
  public render() {
    const barcodeString = localStorage.getItem("barcodes")!;
    let barcodes: Array<string>;
    barcodes = barcodeString.split(",");
    const element = <Barcode value={100000} />;
    console.log(element);
    return (
      <div className={Classes.DARK}>
        {barcodes.map((barcode: string) => {
          return (
            <div style={{ width: "1.75in", height: "0.5in" }}>
              <Barcode
                value={barcode}
                text={"Hyposoft " + barcode}
                text-align="left"
                height={"15"}
                // font-size={10}
                width={"2"}
              />
            </div>
          );
        })}
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default connect(mapStatetoProps)(withRouter(BarcodeView));
