var React = require('react');
var DefaultLayout = require('./layouts/default');

class SignUpPage extends React.Component {
    render() {
        let alertMessage;
        if (this.props.message.length > 0) {
            alertMessage = (
                <div className="alert alert-danger">{ this.props.message }</div>
            );
        }
        return (
            <DefaultLayout title={this.props.title}>
                <div className="main">
                    <h3 className="text-center">Liity jäseneksi</h3>
                    { alertMessage }
                    <form action="/signup" method="post">
                        <div className="form-group">
                            <label>Etunimi</label>
                            <input type="text" className="form-control" name="firstName"></input>
                        </div>
                        <div className="form-group">
                            <label>Sukunimi</label>
                            <input type="text" className="form-control" name="lastName"></input>
                        </div>
                        <div className="form-group">
                            <label>UTU-tunnus (ilman @utu.fi)</label>
                            <input type="text" className="form-control" name="utuAccount"></input>
                        </div>
                        <div className="form-group">
                            <label>Sähköposti</label>
                            <input type="text" className="form-control" name="email"></input>
                        </div>
                        <div className="form-group">
                            <label>Kotikunta</label>
                            <input type="text" className="form-control" name="hometown"></input>
                        </div>
                        <div className="form-group">
                            <label>TYYn jäsen</label>
                            <input type="checkbox" className="form-control" name="tyyMember"></input>
                        </div>
                        <div className="form-group">
                            <label>TIVIAn jäsen</label>
                            <input type="checkbox" className="form-control" name="tiviaMember"></input>
                        </div>
                        <div className="form-group">
                            <label>Salasana</label>
                            <input type="password" className="form-control" name="password"></input>
                        </div>
                        <div className="form-group">
                            <label>Salasana uudelleen</label>
                            <input type="password" className="form-control" name="passwordAgain"></input>
                        </div>

                        <button type="submit" className="btn btn-success"><span className="fa fa-sign-in-alt"></span> Liity jäseneksi</button>
                    </form>
                    <hr></hr>
                    <div className="btm-links">
                        <p><a href="/">Takaisin</a></p>
                    </div>
                </div>
            </DefaultLayout>
        );
    }
}
module.exports = SignUpPage;
