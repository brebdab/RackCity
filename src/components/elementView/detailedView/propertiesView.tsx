import { Card, Classes, Elevation } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import "./propertiesView.scss";
import { isObject, ElementObjectType } from "../../../utils/utils";

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
        col !== "mac_addresses"
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
    return (
      <div>
        {fields.map((item: string) => {
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
                  this.props.history.push("/models/" + data[item].id)
                }
              >
                {data[item].vendor + " " + data[item].model_number}
              </p>
            );
          } else if (item === "rack") {
            dat = <p>{data[item].row_letter + "" + data[item].rack_num}</p>;
          } else if (!isObject(data[item])) {
            //TO DO: decide how to render dicts
            dat = <p>{data[item]}</p>;
          }
          return (
            <div className={"row-props"} key={item}>
              <div className={"column-props"}>
                <p key={item}>{item}:</p>
              </div>
              <div className={"column-props"}>{dat}</div>
            </div>
          );
        })}
      </div>
    );
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
    return (
      <div className={Classes.DARK + " propsview"}>
        <Card interactive={false} elevation={Elevation.TWO}>
          <h5>Properties</h5>
          <div className={"row"}>
            <div className={"column-props"}>
              {this.renderData(this.state.fields, this.props.data)}
            </div>
          </div>
        </Card>
        <div>
          <p> </p>
        </div>
      </div>
    );
  }

  private handleEdit = () => alert("Editor here");
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleDelete = () => {
    alert("Model was successfully deleted"); // TODO change to real deletion
    this.setState({ isDeleteOpen: false });
  };
}

export default withRouter(PropertiesView);
