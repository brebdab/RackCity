import {
  Classes,
  Card,
  Elevation,
  AnchorButton,
  Alert
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import "./propertiesView.scss";

export interface AlertState {
  isDeleteOpen: boolean;
}

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
            var dat = "";
            if (key === "model") {
              dat = data[key].vendor + "" + data[key].model_number;
            } else if (key === "rack") {
              dat = data[key].rack_num + "" + data[key].row_letter;
            } else {
              dat = data[key];
            }
            return (
              <div className={"row"}>
                <div className={"column"}>
                  <p key={item}>{item}:</p>
                </div>
                <div className={"column"}>
                  <p>{dat}</p>
                </div>
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
        <Card interactive={true} elevation={Elevation.TWO}>
          <div className={"row"}>
            <div className={"column"}>
              {this.renderData(
                state.columns.slice(0, mid),
                state.fields.slice(0, mid),
                state.data
              )}
            </div>
            <div className={"column-right"}>
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
