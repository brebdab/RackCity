import {
    Classes,
    AnchorButton,
    Alert,
    Toaster,
    IToastProps,
    Position,
    Intent
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../utils/api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { AssetObject, ElementType, getHeaders } from "../../../utils/utils";

interface PowerViewProps {
    callback: Function
}

interface PowerViewState {

}

export class PowerView extends React.PureComponent<
    RouteComponentProps & PowerViewProps,
    PowerViewState
    > {

    render() {
        return (
            <div>
                <p>here i am</p>
                <AnchorButton
                    intent="primary"
                    minimal
                    text="Close"
                    onClick={() => { this.props.callback() }}
                />
            </div>
        )
    }

}

const mapStatetoProps = (state: any) => {
    return {
        token: state.token,
        isAdmin: state.admin
    };
};

export default withRouter(connect(mapStatetoProps)(PowerView));