import { Spinner } from "@blueprintjs/core";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { ElementType, ModelObject } from "../utils";

interface IModelTableState {
  items: Array<ModelObject>;
}

interface IModelTableProps {
  token: string;
  getData(token: string): Promise<Array<ModelObject>>;
}

class ModelTable extends React.Component<
  IModelTableProps & RouteComponentProps,
  IModelTableState
> {
  public state: IModelTableState = {
    items: []
  };
  componentDidMount() {
    this.props.getData(this.props.token).then(res => {
      this.setState({
        items: res
      });
    });
    console.log("table mounted");
  }

  render() {
    return this.state.items.length === 0 ? (
      <div className="loading-container">
        <Spinner
          className="center"
          intent="primary"
          size={Spinner.SIZE_STANDARD}
        />
      </div>
    ) : (
      <div className="ElementTable">
        <table className="bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered">
          <thead>
            <tr>
              {Object.keys(this.state.items[0]).map((col: string) => {
                if (col !== "id") {
                  return <th>{col}</th>;
                }

                return null;
              })}
            </tr>
          </thead>
          <tbody>
            {this.state.items.map((item: ModelObject) => {
              return (
                <tr
                  onClick={() =>
                    this.props.history.push(
                      "/" + ElementType.MODEL + "/" + item.id
                    )
                  }
                >
                  {Object.entries(item).map(([col, value]) => {
                    if (col !== "id") {
                      return <td>{value}</td>;
                    }
                    return null;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    token: state.token
  };
};
export default connect(mapStateToProps)(withRouter(ModelTable));
