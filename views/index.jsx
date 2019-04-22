var React = require('react');
var DefaultLayout = require('./layouts/default');

class LoginPage extends React.Component {
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
                    <h3 className="text-center">Jäsenrekisteri</h3>
                    { alertMessage }
                    <form action="/" method="post">
                        <div class="form-group">
                            <label>Sähköposti</label>
                            <input type="text" class="form-control" name="email"></input>
                        </div>
                        <div class="form-group">
                            <label>Salasana</label>
                            <input type="password" class="form-control" name="password"></input>
                        </div>

                        <button type="submit" class="btn btn-success"><span class="fa fa-sign-in-alt"></span> Kirjaudu sisään</button>
                    </form>
                    <hr></hr>
                    <div class="btm-links">
                        <p><a href="/signup">Liity jäseneksi</a></p>
                        <p><a href="/">Salasana unohtunut?</a></p>
                    </div>
                </div>
            </DefaultLayout>
        );
    }
}
module.exports = LoginPage;
