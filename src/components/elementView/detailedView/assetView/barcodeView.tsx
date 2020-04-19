import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import Barcode from "react-barcode";
import "./barcodeView.scss";

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
  public componentDidMount() {
    window.moveBy(0, 1000);
    window.print();
  }

  public render() {
    document.body.style.background = "white";
    const barcodeString = localStorage.getItem("barcodes")!;
    let barcodes: Array<string>;
    barcodes = barcodeString.split(",");

    return (
      <div className={Classes.DARK}>
        <table>
          <tbody>{this.renderBarcodes(barcodes)}</tbody>
        </table>
      </div>
    );
  }

  public componentWillUnmount(): void {
    document.body.style.background = "#293742";
  }

  private renderBarcodes(barcodes: Array<string>) {
    var width = 0;
    let row: Array<any>;
    row = [];
    let rows: Array<any>;
    rows = [];
    for (var i = 0; i < barcodes.length; i++) {
      width++;
      if (width < 5) {
        const str = "barcode-container-" + width;
        row.push(
          <td className={str}>
            <Barcode
              value={barcodes[i]}
              text={"Hyposoft " + barcodes[i]}
              text-align="left"
              height={26}
              fontSize={9}
              textMargin={1}
              width={2.25}
              margin={6}
            />
          </td>
        );
      } else {
        width = 1;
        const str = "barcode-container-" + width;
        rows.push(<tr className={"barcode-row"}>{row}</tr>);
        row = [];
        row.push(
          <td className={str}>
            <Barcode
              value={barcodes[i]}
              text={"Hyposoft " + barcodes[i]}
              text-align="left"
              height={26}
              fontSize={9}
              textMargin={1}
              width={2.25}
              margin={6}
            />
          </td>
        );
      }
    }
    if (row.length > 0) {
      rows.push(<tr className={"barcode-row"}>{row}</tr>);
    }
    return rows;
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin,
  };
};

export default connect(mapStatetoProps)(withRouter(BarcodeView));
