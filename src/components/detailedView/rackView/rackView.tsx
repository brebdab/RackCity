import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import "./rackView.scss";
import { RouteComponentProps } from "react-router";

//export interface ElementViewProps {}

export interface RackViewProps {
  instances: any;
}
export interface RouteParams {
  rid: string;
}

export class RackView extends React.PureComponent<
  RouteComponentProps<RouteParams>,
  RackViewProps
> {
  public render() {
    let rows = [];
    let instances = [1, 5, 10];
    let widths = [2, 2, 5];
    const maxHeight = 42;
    let unit = 1;
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

export default RackView;
