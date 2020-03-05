import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import {
  ElementObjectType,
  isObject,
  isAssetObject,
  AssetFieldsTable,
  isModelObject,
  ModelFieldsTable,
  ROUTES
} from "../../../utils/utils";
import "./propertiesView.scss";

export interface AlertState {
  isDeleteOpen: boolean;
  fields: Array<string>;
}
// var console: any = {};
// console.log = function() {};

interface PropertiesViewProps {
  data: ElementObjectType;
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
        col !== "network_graph"
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
        dat = (
          <p
            className="model-link"
            onClick={() =>
              this.props.history.push(ROUTES.MODELS + data[item].id)
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

            <td>
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

            <td>
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
        return (
          <tr>
            <td key={item}>
              <p className="label">{AssetFieldsTable[item]}:</p>
            </td>

            <td>{dat}</td>
          </tr>
        );
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

export default withRouter(PropertiesView);
