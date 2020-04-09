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
  ChangePlan,
} from "../../../utils/utils";
import "./propertiesView.scss";
import { connect } from "react-redux";

export interface AlertState {
  isDeleteOpen: boolean;
  fields: Array<string>;
}

interface PropertiesViewProps {
  data: ElementObjectType;
  changePlan: ChangePlan;
  title?: string;
  data_override?: any;
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
    return fields;
  };
  public state: AlertState = {
    isDeleteOpen: false,
    fields: this.setFieldNamesFromData(),
  };

  renderData(fields: Array<any>, data: any) {
    return fields.map((item: string) => {
      var dat;
      if (item === "display_color") {
        const isCustomField =
          this.props.data_override && this.props.data_override[item];
        const color = isCustomField
          ? this.props.data_override[item]
          : data[item];

        dat = (
          <p
            className="color"
            style={{
              backgroundColor: color,
            }}
          >
            {color}
          </p>
        );
      } else if (item === "network_ports") {
        if (data[item]) {
          const network_ports: Array<string> = data[item];
          dat = <p>{network_ports.toString()}</p>;
        }
      } else if (item === "model") {
        dat = <p>{data[item].vendor + " " + data[item].model_number}</p>;
      } else if (item === "rack") {
        return [
          <tr>
            <td key={item}>
              <p className="label">{AssetFieldsTable[item]}:</p>
            </td>

            <td style={getChangePlanRowStyle(data)}>
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

            <td style={getChangePlanRowStyle(data)}>
              {" "}
              <p>{data[item].datacenter.name}</p>
            </td>
          </tr>,
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

            <td style={getChangePlanRowStyle(data)}>{dat}</td>
          </tr>
        ) : null;
      }
      if (isModelObject(this.props.data)) {
        const isCustomField =
          this.props.data_override && this.props.data_override[item];
        return (
          <tr>
            <td key={item}>
              <p
                className="label"
                style={{
                  fontWeight: isCustomField
                    ? ("bold" as any)
                    : ("normal" as any),
                  color: isCustomField ? "#48AFF0" : "#bfccd6",
                }}
              >
                {ModelFieldsTable[item]}:
              </p>
            </td>

            {isCustomField && item !== "display_color" ? (
              <td>{this.props.data_override[item]}</td>
            ) : (
              <td>{dat}</td>
            )}
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
    if (
      this.state.fields.length === 0 &&
      Object.keys(this.props.data).length !== 0
    ) {
      this.setState({
        fields: this.setFieldNamesFromData(),
      });
    }
    const length = Math.ceil(this.state.fields.length / 4);

    return (
      <div className={Classes.DARK + " propsview"}>
        <h3>{this.props.title ? this.props.title : "Properties"}</h3>

        {Object.keys(this.props.data).length !== 0 ? (
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
        ) : null}
        <p className="custom-message">
          {this.props.data_override
            ? "*Custom fields highlighted in blue"
            : null}
        </p>
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    changePlan: state.changePlan,
  };
};
export default connect(mapStateToProps)(withRouter(PropertiesView));