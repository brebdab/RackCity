import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import WrappedNormalLoginForm from "./login";
import { Classes } from "@blueprintjs/core";
import { connect } from "react-redux";

interface LoginViewProps {
    isAdmin: boolean;
}
export class LoginView extends React.PureComponent<RouteComponentProps & LoginViewProps> {
    public render() {
        return (
            <div className={Classes.DARK}>
                <WrappedNormalLoginForm />
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

export default withRouter(connect(mapStatetoProps)(LoginView));