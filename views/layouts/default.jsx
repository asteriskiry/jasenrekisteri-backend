var React = require('react');

class DefaultLayout extends React.Component {
    render() {
        return (
            <html>
                <head>
                    <title>{this.props.title}</title>
                    <meta charset="utf-8"></meta>
                    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"></meta>
                    <link rel="icon" href="/img/favicon-32x32.png" sizes="32x32"></link>
                    <link rel="icon" href="/img/favicon-192.png" sizes="192x192"></link>
                    <link rel="apple-touch-icon-precomposed" href="/img/favicon-180x180.png"></link>
                    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous"></link>
                    <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.8.1/css/all.css" integrity="sha384-50oBUHEmvpQ+1lW4y57PTFmhCaXp0ML5d60M1M7uH2+nqUivzIebhndOJK28anvf" crossorigin="anonymous"></link>
                    <link rel='stylesheet' id='asteriski-font-css' href='https://fonts.googleapis.com/css?family=Montserrat:300,400,500|Poppins:400,500,600,700,80' type='text/css' media='all'></link>
                    <link href="/css/style.css" rel="stylesheet" type="text/css"></link>
                </head>
                <body>
                    <div class="container">
                        <div class="d-flex justify-content-center">
                            <div class="jumbotron smalljumbo">
                                <img class="mx-auto d-block" src="/img/asteriski-logo.png"></img>
                                {this.props.children}
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        );
    }
}
module.exports = DefaultLayout;
