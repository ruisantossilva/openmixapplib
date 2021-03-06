var handler = new OpenmixApplication({
    // `providers` contains a list of the providers to be load-balanced
    // `alias` is the Openmix alias set in the Portal
    // `cname` is the CNAME or IP address to be sent as the answer when this provider is selected
    providers: {
        'foo': {
            cname: 'www.foo.com'
        },
        'bar': {
            cname: 'www.bar.com'
        },
        'baz': {
            cname: 'www.baz.com'
        }
    },
    // A mapping of ISO 3166-1 country codes to provider aliases
    //country_to_provider: { 'UK': 'bar', 'ES': 'baz' },
    country_to_provider: {},
    // A mapping of market codes to provider aliases
    //market_to_provider: { 'EG': 'foo' }
    market_to_provider: {},
    // Selected if a provider can't be determined
    default_provider: 'foo',
    // The TTL to be set when the application chooses a geo provider.
    default_ttl: 20,
    // The TTL to be set when the application chooses the default provider.
    error_ttl: 20
});

function init(config) {
    'use strict';
    handler.do_init(config);
}

function onRequest(request, response) {
    'use strict';
    handler.handle_request(request, response);
}

/** @constructor */
function OpenmixApplication(settings) {
    'use strict';

    var aliases = settings.providers === undefined ? [] : Object.keys(settings.providers);

    /**
     * @param {OpenmixConfiguration} config
     */
    this.do_init = function(config) {
        var i = aliases.length;

        while (i --) {
            config.requireProvider(aliases[i]);
        }
    };

    /**
     * @param {OpenmixRequest} request
     * @param {OpenmixResponse} response
     */
    this.handle_request = function(request, response) {
        var allReasons,
            decisionProvider,
            decisionReason,
            decisionTtl;

        allReasons = {
            got_expected_market: 'A',
            geo_override_on_country: 'B',
            unexpected_market: 'C'
        };

        /* jshint laxbreak:true */
        if (settings.country_to_provider !== undefined
            && settings.country_to_provider[request.country] !== undefined) {
            // Override based on the request country
            decisionProvider = settings.country_to_provider[request.country];
            decisionTtl = decisionTtl || settings.default_ttl;
            decisionReason = allReasons.geo_override_on_country;
        }
        else if (settings.market_to_provider !== undefined
            && settings.market_to_provider[request.market] !== undefined) {
            // Override based on the request market
            decisionProvider = settings.market_to_provider[request.market];
            decisionTtl = decisionTtl || settings.default_ttl;
            decisionReason = allReasons.got_expected_market;
        }
        else {
            decisionProvider = settings.default_provider;
            decisionTtl = decisionTtl || settings.error_ttl;
            decisionReason = allReasons.unexpected_market;
        }
        /* jshint laxbreak:false */

        response.respond(decisionProvider, settings.providers[decisionProvider].cname);
        response.setTTL(decisionTtl);
        response.setReasonCode(decisionReason);
    };
}
