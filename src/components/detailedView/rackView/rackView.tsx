import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import RackSelectView, {
  RackRangeFields
} from "../../elementView/rackSelectView";
import { InstanceObject, RackResponseObject } from "../../utils";
import "./rackView.scss";
import axios from "axios";
import { API_ROOT } from "../../../api-config";
//export interface ElementViewProps {}

export interface RackViewProps {
  token: string;
  isAdmin: string;
}
export interface RouteParams {
  rid: string;
}

export interface RackViewState {}
class RackView extends React.PureComponent<
  RouteComponentProps & RackViewProps,
  RackViewState
> {
  private getRows(rackResp: RackResponseObject) {
    let rows = [];

    let unit = 1;
    let currHeight = 0;
    const { height } = rackResp.rack;
    let instances: Array<InstanceObject> = Object.assign(
      [],
      rackResp.instances
    );
    // console.log(row_letter, rack_num, height);
    // console.log("rackResp", rackResp);
    // console.log("initial", instances, rackResp.instances);

    let maxHeight: number = +height;

    while (currHeight < maxHeight) {
      //temporary fix to ignore the second conflicting instance
      if (instances.length > 0 && currHeight > +instances[0].elevation) {
        const inst = instances.shift();
        console.warn("CONFLICTING INSTANCES ", inst);
      }
      if (
        instances.length > 0 &&
        instances[0] &&
        currHeight === +instances[0].elevation - 1
      ) {
        const width = +instances[0].model.height;
        const id: number = +instances[0].id;

        if (width + currHeight > maxHeight) {
          console.warn("INSTANCE OUT OF RANGE ", instances[0]);

          currHeight++;

          rows.unshift(
            <tr className="rack-row">
              <td className="cell empty"></td>
            </tr>
          );
        } else {
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
                {instances[0].model.vendor +
                  " " +
                  instances[0].model.model_number +
                  " | " +
                  instances[0].hostname}
              </td>
            </tr>
          );

          instances.shift();
        }
      } else {
        currHeight++;

        rows.unshift(
          <tr className="rack-row">
            <td className="cell empty"></td>
          </tr>
        );
      }
    }
    console.log(rows);

    return rows;
  }
  getUnitRows(rackResp: RackResponseObject) {
    const { height } = rackResp.rack;

    let maxHeight: number = +height;
    let unitBarRows = [];
    for (let i = 1; i <= maxHeight; i++) {
      unitBarRows.unshift(
        <tr className="rack-row" style={{ lineHeight: 1 }}>
          <td className="cell unit"> {i}U </td>
        </tr>
      );
    }
    return unitBarRows;
  }
  viewRackForm = (rack: RackRangeFields, headers: any) => {
    return axios.post(API_ROOT + "api/racks/get", rack, headers).then(res => {
      this.props.history.replace("/racks", res.data.racks);
      this.props.history.push({
        pathname: "/racks",
        state: res.data.racks
      });
    });
  };
  public render() {
    // if (this.props.location.state.length === 0) {
    //   this.getRackRange(this.props.token);
    // }
    const racks: Array<RackResponseObject> =
      this.props.location && this.props.location.state
        ? (this.props.location.state as Array<RackResponseObject>)
        : [];

    return (
      <div>
        <div className={Classes.DARK}>
          <RackSelectView submitForm={this.viewRackForm} />
        </div>
        <div className="rack-container">
          {racks.map((rackResp: RackResponseObject) => {
            return (
              <span>
                <div className={Classes.DARK + " rack"}>
                  <table className=" bp3-html-table bp3-interactive rack-table">
                    <thead>
                      <tr>
                        <th className=" cell header">
                          Rack {rackResp.rack.row_letter}
                          {rackResp.rack.rack_num}
                        </th>
                      </tr>
                    </thead>
                    <tbody>{this.getRows(rackResp)}</tbody>
                  </table>
                  <table className="bp3-html-table loc-table">
                    <thead>
                      <tr>
                        <th className=" cell header"> (U)</th>
                      </tr>
                    </thead>
                    <tbody>{this.getUnitRows(rackResp)}</tbody>
                  </table>
                </div>
              </span>
            );
          })}
        </div>
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
