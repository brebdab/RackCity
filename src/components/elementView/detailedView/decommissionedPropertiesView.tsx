import { Classes } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import {
    ElementObjectType,
    DecommissionedFieldsTable,
} from "../../../utils/utils";

interface DecommissionedPropertiesViewProps {
    data: ElementObjectType;
}
export interface AlertState {
    isDeleteOpen: boolean;
    fields: Array<string>;
}

class DecommissionedPropertiesView extends React.PureComponent<
    RouteComponentProps & DecommissionedPropertiesViewProps,
    AlertState
    > {
    setFieldNamesFromData = () => {
        let fields: Array<string> = [];
        Object.keys(this.props.data).forEach((col: string) => {
            if (
                col === "decommissioning_user" ||
                col === "time_decommissioned"
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
            var dat;
            dat = <p>{data[item]}</p>;
            return (
                <tr>
                    <td key={item}>
                        <p className="label">{DecommissionedFieldsTable[item]}:</p>
                    </td>

                    <td>{dat}</td>
                </tr>
            );
        });
    }

    public render() {
        return (
            <div className={Classes.DARK + " propsview"}>
                <h3>Decommissioned</h3>
                <div className="propsdetail">
                    <div className="props-column">
                        <table className="bp3-html-table">
                            {this.renderData(
                                this.state.fields,
                                this.props.data
                            )}
                        </table>
                    </div>
                </div>
            </div>
        );
    }
}

export default withRouter(DecommissionedPropertiesView);