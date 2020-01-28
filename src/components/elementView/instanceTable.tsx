import { Spinner } from "@blueprintjs/core";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import {
  ElementType,
  InstanceObject,
  isModelObject,
  isRackObject
} from "../utils";

interface IInstanceTableState {
  items: Array<InstanceObject>;
}

interface IInstanceTableProps {
  token: string;
  getData(token: string): Promise<Array<InstanceObject>>;
}

class InstanceTable extends React.Component<
  IInstanceTableProps & RouteComponentProps,
  IInstanceTableState
> {
  public state: IInstanceTableState = {
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
            {this.state.items.map((item: InstanceObject) => {
              return (
                <tr
                  onClick={() =>
                    this.props.history.push(
                      "/" + ElementType.INSTANCE + "/" + item.id // TODO replace test_rid with param */
                      // { rackname: "hello" } // pass additional props here
                    )
                  }
                >
                  {Object.entries(item).map(([col, value]) => {
                    if (isModelObject(value)) {
                      return <td>{value.vendor + " " + value.model_number}</td>;
                    } else if (isRackObject(value)) {
                      return <td>{value.row_letter + " " + value.rack_num}</td>;
                    } else if (col !== "id") {
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
export default connect(mapStateToProps)(withRouter(InstanceTable));
