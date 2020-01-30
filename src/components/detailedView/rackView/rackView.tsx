import { Classes, AnchorButton } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { InstanceObject, RackResponseObject } from "../../utils";
import "./rackView.scss";
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
              <span>
                {instances[0].model.vendor +
                  " " +
                  instances[0].model.model_number}
              </span>
              <span>{instances[0].hostname}</span>
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
          <AnchorButton
            onClick={() => this.props.history.push("/")}
            className={"nav-bar-button"}
            icon="search"
            text="New Rack Search"
            minimal
          />
        </div>
        <div className="rack-container">
          {racks.map((rackResp: RackResponseObject) => {
            return (
              <span>
                <div className={Classes.DARK + " rack"}>
                  <table className=" bp3-html-table bp3-interactive bp3-html-table-bordered rack-table">
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
                  <table className="bp3-html-table bp3-html-table-bordered loc-table">
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
