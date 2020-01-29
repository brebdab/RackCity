import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import "./rackView.scss";
import { RouteComponentProps, withRouter } from "react-router";
import {
  getHeaders,
  RackResponseObject,
  isInstanceObject,
  InstanceObject
} from "../../utils";
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
  racks: Array<RackResponseObject>;
}
class RackView extends React.PureComponent<
  RouteComponentProps & RackViewProps,
  RackViewState
> {
  public state = {
    racks: []
  };
  getRackRange(token: string) {
    const headers = getHeaders(token);
    const body = {
      letter_start: "A",
      letter_end: "B",
      num_start: 1,
      num_end: 2
    };
    axios.post(API_ROOT + "api/racks/get", body, headers).then(res => {
      console.log(res);
      this.setState({
        racks: res.data.racks
      });
    });
  }

  private getRows(rackResp: RackResponseObject) {
    let rows = [];

    let unit = 1;
    let currHeight = 0;
    const { row_letter, rack_num, height } = rackResp.rack;
    let instances: Array<InstanceObject> = Object.assign(
      [],
      rackResp.instances
    );
    console.log(row_letter, rack_num, height);
    console.log("rackResp", rackResp);
    console.log("initial", instances, rackResp.instances);

    let maxHeight: number = +height;

    while (currHeight < maxHeight) {
      //temporary fix to ignore the second conflicting instance
      if (instances.length > 0 && currHeight > +instances[0].elevation) {
        const inst = instances.shift();
        console.warn("CONFLICTING INSTANCES ", inst);
      }
      if (instances.length > 0 && currHeight === +instances[0].elevation) {
        const width = +instances[0].model.height;
        const id: number = +instances[0].id;

        currHeight = width + currHeight;
        rows.unshift(
          <tr
            className="rack-row"
            style={{
              lineHeight: unit * width,
              backgroundColor: instances[0].model.display_color
            }}
          >
            <td
              className="cell"
              onClick={() => this.props.history.push("/instances/" + id)}
            >
              {" "}
              {instances[0].hostname}
            </td>
          </tr>
        );

        instances.shift();
      } else {
        currHeight++;

        rows.unshift(
          <tr className="rack-row">
            <td className="cell empty"> </td>
          </tr>
        );
      }
    }

    return rows;
  }
  getUnitRows(rackResp: RackResponseObject) {
    const { height } = rackResp.rack;

    let maxHeight: number = +height;
    let unitBarRows = [];
    for (let i = 1; i <= maxHeight; i++) {
      unitBarRows.unshift(
        <tr className="rack-row" style={{ lineHeight: 1 }}>
          <td className="cell"> {i}U </td>
        </tr>
      );
    }
    return unitBarRows;
  }
  public render() {
    console.log(this.state.racks);
    if (this.state.racks.length === 0) {
      this.getRackRange(this.props.token);
    }

    return (
      <div className="rack-container">
        {this.state.racks.map((rackResp: RackResponseObject) => {
          return (
            <div className={Classes.DARK + " rack"}>
              <table className=" bp3-html-table bp3-interactive bp3-html-table-bordered rack-table">
                <thead>
                  <tr>
                    <th className=" cell header">Rack</th>
                  </tr>
                </thead>
                <tbody>{this.getRows(rackResp)}</tbody>
              </table>
              <table className="bp3-html-table bp3-html-table-bordered loc-table">
                <thead>
                  <tr>
                    <th className=" cell header"> (U)</th>
                  </tr>
                </thead>
                <tbody>{this.getUnitRows(rackResp)}</tbody>
              </table>
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

export default connect(mapStatetoProps)(withRouter(RackView));
