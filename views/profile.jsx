var React = require('react');
var LoggedInLayout = require('./layouts/logged-in.jsx');

class ProfilePage extends React.Component {
    render() {
        return (
            <LoggedInLayout title={this.props.title} user={this.props.user} active="profile">
                <div className="container">
                    <div className="row">
                        <div className="col-sm-6">
                            <div className="well">
                                <h3><span className="fa fa-user"></span> { this.props.user.firstName } { this.props.user.lastName }</h3>
                                <p><strong>ID</strong>: { this.props.user._id.toString() }</p>
                                <p><strong>UTU-tunnus</strong>: { this.props.user.utuAccount }</p>
                                <p><strong>Sähköpostiosoite</strong>: { this.props.user.email }</p>
                                <p><strong>Kotikunta</strong>: { this.props.user.hometown }</p>
                                <p><strong>TYY-jäsenyys</strong>: { this.props.user.tyyMember.toString() }</p>
                                <p><strong>TIVIA-jäsenyys</strong>: { this.props.user.tiviaMember.toString() }</p>
                                <p><strong>Hash</strong>: { this.props.user.password }</p>
                            </div>
                        </div>
                    </div>
                </div>
            </LoggedInLayout>
        );
    }
}
module.exports = ProfilePage;
