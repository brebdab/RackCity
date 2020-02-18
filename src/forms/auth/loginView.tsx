import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import WrappedNormalLoginForm from "./login";
import { Classes, AnchorButton } from "@blueprintjs/core";
import { connect } from "react-redux";
import "./loginView.scss";
import * as QueryString from "query-string"
import { isNullOrUndefined } from "util";
import axios from "axios";
import { API_ROOT } from "../../utils/api-config";
import * as actions from "../../store/actions/auth";

export interface LoginViewProps {
    token: string;
    onAuth(acess_token: string): any;
}

export class LoginView extends React.PureComponent<RouteComponentProps & LoginViewProps> {
    private handleSSOClick = () => {
        window.location.href = "https://oauth.oit.duke.edu/oauth/authorize.php?client_id=hyposoft-rack-city&response_type=token&state=1129&scope=basic&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Flogin";
    };
    public componentDidMount() {
        console.log("hi it's me julia")
        const params = QueryString.parse(window.location.hash.substring(1))
        const access_token = params.access_token
        if (!isNullOrUndefined(access_token)) {
            console.log("hi i have access token")
            this.props.onAuth(access_token.toString());
        }
    }
    public render() {
        return (
            <div className={Classes.DARK + " login-container"}>
                <WrappedNormalLoginForm />
                <AnchorButton onClick={this.handleSSOClick}>SSO Login</AnchorButton>
            </div >
        )
    };
}

const mapStatetoProps = (state: any) => {
    return {
        token: state.token
    };
};
const mapDispatchToProps = (dispatch: any) => {
    return {
        onAuth: (acess_token: string) =>
            dispatch(actions.netidAuthLogin(acess_token))
    };
};
export default connect(mapStatetoProps, mapDispatchToProps)(withRouter(LoginView));