import { Card, Classes, Elevation } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import "./propertiesView.scss";

export interface AlertState {
  isDeleteOpen: boolean;
}
var console: any = {};
console.log = function() {};

interface PropertiesViewProps {
  data: any;
}

class PropertiesView extends React.PureComponent<
  RouteComponentProps & PropertiesViewProps,
  AlertState
> {
  public state: AlertState = {
    isDeleteOpen: false
  };

  renderData(columns: Array<any>, fields: Array<any>, data: any) {
    try {
      var i = -1;
      return (
        <div>
          {columns.map((item: string) => {
            i++;
            var key = fields[i];
            var dat;
            if (key === "display_color") {
              dat = (
                <p
                  className="color"
                  style={{
                    backgroundColor: data[key]
                  }}
                >
                  {data[key]}
                </p>
              );
            } else if (key === "model") {
              dat = (
                <p
                  className="model-link"
                  onClick={() =>
                    this.props.history.push("/models/" + data[key].id)
                  }
                >
                  {data[key].vendor + " " + data[key].model_number}
                </p>
              );
            } else if (key === "rack") {
              dat = <p>{data[key].row_letter + "" + data[key].rack_num}</p>;
            } else {
              dat = <p>{data[key]}</p>;
            }
            return (
              <div className={"row-props"}>
                <div className={"column-props"}>
                  <p key={item}>{item}:</p>
                </div>
                <div className={"column-props"}>{dat}</div>
              </div>
            );
          })}
        </div>
      );
    } catch (Error) {
      console.log(Error);
    }
  }

  public render() {
    let state: any;
    state = this.props;
    const mid = state.columns.length / 2 + 1;
    return (
      <div className={Classes.DARK + " propsview"}>
        <Card interactive={false} elevation={Elevation.TWO}>
          <h5>Properties</h5>
          <div className={"row"}>
            <div className={"column-props"}>
              {this.renderData(
                state.columns.slice(0, mid),
                state.fields.slice(0, mid),
                state.data
              )}
            </div>
            <div className={"column-props"}>
              {this.renderData(
                state.columns.slice(mid, state.fields.length),
                state.fields.slice(mid, state.fields.length),
                state.data
              )}
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
