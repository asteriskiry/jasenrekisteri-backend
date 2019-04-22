var React = require('react');
var LoggedInLayout = require('./layouts/logged-in.jsx');

class AdminPage extends React.Component {
    render() {
        return (
            <LoggedInLayout title={this.props.title} user={this.props.user} active="admin">
                <div class="container">
                    <div class="row">
                        <div class="col-sm-12">
                            <div class="well">
                                <h3>Jäsenrekisterin hallinta</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </LoggedInLayout>
        );
    }
}
module.exports = AdminPage;
