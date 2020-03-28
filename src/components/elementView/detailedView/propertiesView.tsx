import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import {
  AssetFieldsTable,
  ElementObjectType,
  getChangePlanRowStyle,
  isAssetObject,
  isModelObject,
  isObject,
  ModelFieldsTable,
  ROUTES,
  ChangePlan
} from "../../../utils/utils";
import "./propertiesView.scss";
import { connect } from "react-redux";

export interface AlertState {
  isDeleteOpen: boolean;
  fields: Array<string>;
}
// var console: any = {};
// console.log = function() {};

interface PropertiesViewProps {
  data: ElementObjectType;
  changePlan: ChangePlan;
}

class PropertiesView extends React.PureComponent<
  RouteComponentProps & PropertiesViewProps,
  AlertState
> {
  setFieldNamesFromData = () => {
    let fields: Array<string> = [];
    Object.keys(this.props.data).forEach((col: string) => {
      if (
        col !== "id" &&
        col !== "power_connections" &&
        col !== "mac_addresses" &&
        col !== "network_connections" &&
        col !== "network_graph" &&
        col !== "decommissioned_id" &&
        col !== "decommissioning_user" &&
        col !== "time_decommissioned"
      ) {
        fields.push(col);
      }
    });
    console.log("FIELDS", this.props.data, fields);
    return fields;
  };
  public state: AlertState = {
    isDeleteOpen: false,
    fields: this.setFieldNamesFromData()
  };

  renderData(fields: Array<any>, data: any) {
    return fields.map((item: string) => {
      if (item === "display_color") {
        var dat;
        dat = (
          <p
            className="color"
            style={{
              backgroundColor: data[item]
            }}
          >
            {data[item]}
          </p>
        );
      } else if (item === "network_ports") {
        console.log(item, data[item]);
        if (data[item]) {
          const network_ports: Array<string> = data[item];
          console.log(network_ports.toString());
          dat = <p>{network_ports.toString()}</p>;
        }
      } else if (item === "model") {
        const isDecommissioned = data["decommissioning_user"];
        dat = (
          <p
            className={isDecommissioned ? undefined : "model-link"}
            onClick={
              isDecommissioned
                ? undefined
                : () =>
                    this.props.history.push(ROUTES.MODELS + "/" + data[item].id)
            }
          >
            {data[item].vendor + " " + data[item].model_number}
          </p>
        );
      } else if (item === "rack") {
        return [
          <tr>
            <td key={item}>
              <p className="label">{AssetFieldsTable[item]}:</p>
            </td>

            <td style={getChangePlanRowStyle(data, this.props.changePlan)}>
              {" "}
              <p>{data[item].row_letter + "" + data[item].rack_num}</p>
            </td>
          </tr>,
          <tr>
            <td key={"datacenter"}>
              <p className="label">
                {AssetFieldsTable["rack__datacenter__name"]}:
              </p>
            </td>

            <td style={getChangePlanRowStyle(data, this.props.changePlan)}>
              {" "}
              <p>{data[item].datacenter.name}</p>
            </td>
          </tr>
        ];
      } else if (item === "comment") {
        dat = <p className="comment">{data[item]}</p>;
      } else if (!isObject(data[item])) {
        //TO DO: decide how to render dicts
        dat = <p>{data[item]}</p>;
      }

      if (isAssetObject(this.props.data)) {
        return AssetFieldsTable[item] ? (
          <tr>
            <td key={item}>
              <p className="label">{AssetFieldsTable[item]}:</p>
            </td>

            <td
              style={getChangePlanRowStyle(
                this.props.data,
                this.props.changePlan
              )}
            >
              {dat}
            </td>
          </tr>
        ) : null;
      }
      if (isModelObject(this.props.data)) {
        return (
          <tr>
            <td key={item}>
              <p className="label">{ModelFieldsTable[item]}:</p>
            </td>

            <td>{dat}</td>
          </tr>
        );
      } else {
        return (
          <tr>
            <td key={item}>
              <p className="label">{item}:</p>
            </td>

            <td>{dat}</td>
          </tr>
        );
      }
    });
  }

  public render() {
    console.log(this.props.data);
    if (
      this.state.fields.length === 0 &&
      Object.keys(this.props.data).length !== 0
    ) {
      console.log(this.setFieldNamesFromData());
      this.setState({
        fields: this.setFieldNamesFromData()
      });
    }
    const length = Math.ceil(this.state.fields.length / 4);

    return (
      <div className={Classes.DARK + " propsview"}>
        <h3>Properties</h3>
        <div className="propsdetail">
          <div className="props-column">
            <table className="bp3-html-table">
              {this.renderData(
                this.state.fields.slice(0, length),
                this.props.data
              )}
            </table>
          </div>
          <div className="props-column">
            <table className="bp3-html-table">
              {this.renderData(
                this.state.fields.slice(length, 2 * length),
                this.props.data
              )}
            </table>
          </div>
          <div className="props-column">
            <table className="bp3-html-table">
              {this.renderData(
                this.state.fields.slice(2 * length, 3 * length),
                this.props.data
              )}
            </table>
          </div>
          <div className="props-column">
            <table className="bp3-html-table">
              {this.renderData(
                this.state.fields.slice(3 * length),
                this.props.data
              )}
            </table>
          </div>
        </div>
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    changePlan: state.changePlan
  };
};
export default connect(mapStateToProps)(withRouter(PropertiesView));
