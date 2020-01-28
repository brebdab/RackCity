import { Classes, Card, Elevation, AnchorButton, Alert } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
// import axios from "axios";
import * as React from "react";
import { RouteComponentProps } from "react-router";
import "./propertiesView.scss";

export interface AlertState {
  isDeleteOpen: boolean;
}

export class PropertiesView extends React.PureComponent<RouteComponentProps, AlertState> {

  public state: AlertState = {
    isDeleteOpen: false
  }

    renderData(columns: Array<any>, fields: Array<any>, data: any) {
      var i = -1;
      return (
        <div>
          {columns.map((item: string) => {
            i++;
            var key = fields[i];
            // return <h3 key={item}>{item}: {data[key]}</h3>
            return (
              <div className={"row"}>
                <div className={"column"}>
                  <p key={item}>{item}:</p>
                </div>
                <div className={"column"}>
                  <p>{data[key]}</p>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    public render() {
      let state: any;
      state = this.props;
      const data = state.state;
      const mid = data.columns.length/2 + 1
      return (
        <div className={Classes.DARK + " propsview"}>
          <Card interactive={true} elevation={Elevation.TWO}>
            <div className={"row"}>
              <div className={"column"}>
                {this.renderData(data.columns.slice(0, mid), data.fields.slice(0, mid), data)}
              </div>
              <div className={"column-right"}>
                {this.renderData(data.columns.slice(mid, data.fields.length), data.fields.slice(mid, data.fields.length), data)}
              </div>
            </div>
          </Card>
          <div><p> </p></div>
          <div className={"row"}>
            <div className={"column"}>
              <AnchorButton large={true} intent="primary" icon="edit" text="Edit Model" onClick={this.handleEdit} />
            </div>
            <div className={"column"}>
              <AnchorButton large={true} intent="danger" icon="trash" text="Delete Model" onClick={this.handleDeleteOpen}/>
              <Alert
                cancelButtonText="Cancel"
                confirmButtonText="Delete"
                intent="danger"
                isOpen={this.state.isDeleteOpen}
                onCancel={this.handleDeleteCancel}
                onConfirm={this.handleDelete}
              >
                <p>Are you sure you want to delete?</p>
              </Alert>
            </div>
          </div>
        </div>
      )
    }

    private handleEdit = () => alert("Editor here")
    private handleDeleteOpen = () => this.setState({isDeleteOpen: true});
    private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
    private handleDelete = () => {
      alert("Model was successfully deleted") // TODO change to real deletion
      this.setState({ isDeleteOpen: false })
    }

}

export default PropertiesView
