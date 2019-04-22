var React = require('react');
var LoggedInLayout = require('./layouts/logged-in.jsx');

class EditProfilePage extends React.Component {
    render() {
        return (
            <LoggedInLayout title={this.props.title} user={this.props.user} active="edit-profile">
                <div className="container">
                    <div className="row">
                        <div className="col-sm-6">
                            <div className="well">
                                <h3>Muokkaa tietoja</h3>
                            </div>
                        </div>
                    </div>
                </div>
            </LoggedInLayout>
        );
    }
}
module.exports = EditProfilePage;
