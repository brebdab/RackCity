import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import "./rackView.scss";
import { RouteComponentProps, withRouter } from "react-router";
import { getHeaders, RackResponseObject } from "../../utils";
import { API_ROOT } from "../../../api-config";
import axios from "axios";
import { connect } from "react-redux";
//export interface ElementViewProps {}

export interface RackViewProps {
  token: string;
  isAdmin: string;
}
export interface RouteParams {
  rid: string;
}
export interface RackViewState {
  rackResponse: Array<RackResponseObject>;
}
class RackView extends React.PureComponent<
  RouteComponentProps<RouteParams> & RackViewProps,
  RackViewState
> {
  public state = {
    rackResponse: []
  };
  getRackRange(token: string) {
    const headers = getHeaders(token);
    const body = {
      letter_start: "A",
      letter_end: "B",
      number_start: 1,
      number_end: 2
    };
    axios
      .post(API_ROOT + "api/racks/get", body, headers)
      .then(res => console.log(res));
  }
  public render() {
    this.getRackRange(this.props.token);
    let rows = [];
    let instances = [1, 5, 10];
    let widths = [2, 2, 5];
    const maxHeight = 42;
    let unit = 2;
    let currHeight = 0;
    while (currHeight < maxHeight) {
      if (currHeight === instances[0]) {
        currHeight = widths[0] + currHeight;
        rows.unshift(
          <tr className="rack-row" style={{ lineHeight: unit * widths[0] }}>
            <td className="cell"> instance</td>
          </tr>
        );
        instances.shift();
        widths.shift();
      } else {
        currHeight++;
        rows.unshift(
          <tr className="rack-row">
            <td className="cell empty"> </td>
          </tr>
        );
      }
    }
    let unitBarRows = [];
    for (let i = 1; i <= maxHeight; i++) {
      unitBarRows.unshift(
        <tr className="rack-row" style={{ lineHeight: 1 }}>
          <td className="cell"> {i}U </td>
        </tr>
      );
    }
    return (
      <div className={Classes.DARK + " whole"}>
        <table className=" bp3-html-table bp3-interactive bp3-html-table-bordered rack-table">
          <thead>
            <tr>
              <th className=" cell header">
                Rack {this.props.match.params.rid}
              </th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        <table className="bp3-html-table bp3-html-table-bordered loc-table">
          <thead>
            <tr>
              <th className=" cell header"> (U)</th>
            </tr>
          </thead>
          <tbody>{unitBarRows}</tbody>
        </table>
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

export default connect(mapStatetoProps)(withRouter(RackView));
