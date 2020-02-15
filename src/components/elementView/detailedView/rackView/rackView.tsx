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
import {
  getHeaders,
  AssetObject,
  RackResponseObject
} from "../../../../utils/utils";
import "./rackView.scss";
//export interface ElementViewProps {}

export interface RackViewProps {
  token: string;
  isAdmin: string;
  racks: Array<RackResponseObject>;
  loading: boolean;
}
export interface RouteParams {
  rid: string;
}
// var console: any = {};
// console.log = function() {};
// console.warn = function() {};

export interface RackViewState {
  isDeleteOpen: boolean;
}
class RackView extends React.PureComponent<
  RouteComponentProps & RackViewProps,
  RackViewState
  > {
  state = { isDeleteOpen: false };
  private getRows(rackResp: RackResponseObject) {
    let rows = [];

    let unit = 1;
    let currHeight = 0;
    const { height } = rackResp.rack;
    let assets: Array<AssetObject> = Object.assign(
      [],
      rackResp.assets
    );
    // console.log(row_letter, rack_num, height);
    // console.log("rackResp", rackResp);
    // console.log("initial", assets, rackResp.assets);

    let maxHeight: number = +height;

    while (currHeight < maxHeight) {
      //temporary fix to ignore the second conflicting asset
      if (assets.length > 0 && currHeight > +assets[0].rack_position) {
        const inst = assets.shift();
        console.warn("CONFLICTING ASSETS ", inst);
      }
      if (
        assets.length > 0 &&
        assets[0] &&
        currHeight === +assets[0].rack_position - 1
      ) {
        const width = +assets[0].model.height;
        const id: number = +assets[0].id;

        if (width + currHeight > maxHeight) {
          console.warn("ASSET OUT OF RANGE ", assets[0]);

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
                backgroundColor: assets[0].model.display_color
              }}
            >
              <td
                className="cell"
                onClick={() => this.props.history.push("/assets/" + id)}
              >
                {assets[0].model.vendor +
                  " " +
                  assets[0].model.model_number +
                  " | " +
                  assets[0].hostname}
              </td>
            </tr>
          );

          assets.shift();
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
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }
  private toaster: Toaster = {} as Toaster;
  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };
  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleDelete = (letter: string, num: string) => {
    const body = {
      letter_start: letter,

      num_start: num
    };

    axios
      .post(API_ROOT + "api/racks/delete", body, getHeaders(this.props.token))
      .then(res => {
        this.setState({ isDeleteOpen: false });
      })
      .catch(err => {
        this.handleDeleteCancel();
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
      });
  };

  public render() {
    // if (this.props.location.state.length === 0) {
    //   this.getRackRange(this.props.token);
    // }
    // const racks: Array<RackResponseObject> =
    //   this.props.location && this.props.location.state
    //     ? (this.props.location.state as Array<RackResponseObject>)
    //     : [];
    const racks = this.props.racks;

    return (
      <div className={Classes.DARK}>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        {this.props.loading ? (
          <Spinner
            className="center"
            intent="primary"
            size={Spinner.SIZE_STANDARD}
          />
        ) : (
            <div className="rack-container">
              {racks.map((rackResp: RackResponseObject) => {
                return (
                  <span>
                    <div className="rack-parent">
                      {/* <div className="delete-rack">
                    <AnchorButton
                      minimal
                      intent="danger"
                      icon="trash"
                      text="Delete"
                      onClick={this.handleDeleteOpen}
                    />
                  </div> */}
                      <Alert
                        cancelButtonText="Cancel"
                        confirmButtonText="Delete"
                        intent="danger"
                        isOpen={this.state.isDeleteOpen}
                        onCancel={this.handleDeleteCancel}
                        onConfirm={() =>
                          this.handleDelete(
                            rackResp.rack.row_letter,
                            rackResp.rack.rack_num
                          )
                        }
                      >
                        {" "}
                        <p>Are you sure you want to delete?</p>
                      </Alert>
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
                    </div>
                  </span>
                );
              })}
            </div>
          )}
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
