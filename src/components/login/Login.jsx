import "@mantine/core/styles/Input.css";
import "@mantine/core/styles/Input.layer.css";
import "@mantine/core/styles/PasswordInput.css";
import "@mantine/core/styles/PasswordInput.layer.css";

import LoginStyles from "@/assets/stylesheets/modules/login.module.scss";

import {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react-lite";
import {pocketStore, rootStore} from "@/stores";

import {Button, LocalizeString, Loader, HashedLoaderImage} from "@/components/common/Common.jsx";
import {CreateModuleClassMatcher, ValidEmail} from "@/utils/Utils.js";
import {Redirect, useParams} from "wouter";
import {MantineProvider, PasswordInput, TextInput} from "@mantine/core";
import Modal from "@/components/common/Modal.jsx";

import AppleLogo from "@/assets/images/apple-logo.png";
import GoogleLogo from "@/assets/images/google-logo.png";
import PoweredByLogo from "@/assets/images/powered-by-eluvio.png";

const S = CreateModuleClassMatcher(LoginStyles);

const searchParams = new URLSearchParams(decodeURIComponent(window.location.search));

// Settings form has other stuff in it, build password form manually
const PasswordResetForm = ({OrySubmit, nodes}) => {
  const csrfToken = nodes.find(node => node.attributes.name === "csrf_token").attributes.value;

  return (
    <>
      <input name="csrf_token" type="hidden" required value={csrfToken} />
      <PasswordInput
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="Password"
        classNames={{
          root: S("login-input__input-container"),
          wrapper: S("login-input__wrapper"),
          input: S("login-input__input"),
          innerInput: S("login-input__input", "login-input__input--password"),
          visibilityToggle: S("login-input__visibility-toggle")
        }}
      />
      <PasswordInput
        name="password_confirmation"
        type="password"
        required
        placeholder="Password Confirmation"
        classNames={{
          root: S("login-input__input-container"),
          wrapper: S("login-input__wrapper"),
          input: S("login-input__input"),
          innerInput: S("login-input__input", "login-input__input--password"),
          visibilityToggle: S("login-input__visibility-toggle")
        }}
      />
      <input name="method" type="hidden" placeholder="Save" value="password" />
      <Button onClick={OrySubmit} type="submit" action={false} className={S("button", "button--primary")}>
        { rootStore.l10n.login.ory.actions.update_password }
      </Button>
    </>
  );
};

const LoginLimitedForm = observer(({Submit, Cancel}) => {
  return (
    <>
      <div className={S("message")}>
        { rootStore.l10n.login.ory.messages.login_limited }
      </div>
      <Button onClick={Submit} type="submit" action={false} className={S("button", "button--primary")}>
        { rootStore.l10n.login.ory.actions.proceed }
      </Button>
      <button
        key="back-link"
        onClick={Cancel}
        className={S("text-button")}
      >
        {rootStore.l10n.login.ory.actions.back_to_sign_in}
      </button>
    </>
  );
});

const ForgotPasswordForm = ({OrySubmit, Cancel}) => {
  const [email, setEmail] = useState("");
  const [valid, setValid] = useState(false);


  useEffect(() => {
    setValid(email && ValidEmail(email));
  }, [email]);

  return (
    <>
      <TextInput
        name="email"
        type="email" required=""
        placeholder="Email"
        autoFocus
        value={email}
        onChange={event => setEmail(event.target.value)}
        classNames={{
          root: S("login-input__input-container"),
          wrapper: S("login-input__wrapper"),
          input: S("login-input__input"),
          visibilityToggle: S("login-input__visibility-toggle")
        }}
      />
      <Button
        onClick={OrySubmit}
        type="submit"
        action={false}
        disabled={!valid}
        className={S("button", "button--primary")}
      >
        Submit
      </Button>
      <button
        key="back-link"
        onClick={Cancel}
        className={S("text-button")}
      >
        {rootStore.l10n.login.ory.actions.back_to_sign_in}
      </button>
    </>
  );
};

let submitting = false;
const SubmitRecoveryCode = async ({flows, setFlows, setFlowType, setErrorMessage}) => {
  if(submitting) {
    return;
  }

  submitting = true;

  const RecoveryFailed = async () => {
    if(searchParams.get("code")) {
      setFlowType("login");

      setTimeout(() => setErrorMessage(rootStore.l10n.login.ory.errors.invalid_recovery_email), 250);
      return;
    }

    // Code redemption failed
    const newFlow = await rootStore.oryClient.createBrowserRecoveryFlow();

    setFlows({
      ...flows,
      recovery: newFlow.data
    });
    setFlowType("recovery");

    setTimeout(() => setErrorMessage(rootStore.l10n.login.ory.errors.invalid_recovery_email), 250);
  };

  try {
    const createResponse = await rootStore.oryClient.getRecoveryFlow({id: searchParams.get("flow")});

    if(searchParams.has("code")) {
      try {
        const updateResponse = await rootStore.oryClient.updateRecoveryFlow({
          flow: searchParams.get("flow"),
          updateRecoveryFlowBody: {
            code: searchParams.get("code"),
            method: "code"
          }
        });

        // Code redemption succeeded
        setFlowType(updateResponse.data.state === "passed_challenge" ? "settings" : "recovery");
        setFlows({...flows, recovery: updateResponse.data});

        return true;
      } catch(error) {
        rootStore.Log(error, true);
        await RecoveryFailed();
        return false;
      }
    } else {
      // Flow initialized
      setFlowType("recovery");
      setFlows({...flows, recovery: createResponse.data});
      return true;
    }
  } catch(error) {
    // Flow initialization failed
    rootStore.Log(error, true);
    await RecoveryFailed();
    return false;
  } finally {
    submitting = false;
  }
};

const OryLogin = observer(({
  userData,
  nonce,
  installId,
  origin,
  requiredOptionsMissing,
  isThirdPartyCallback,
  isThirdPartyConflict,
  loading,
  next
}) => {
  const {pocketSlugOrId} = useParams();
  const [flowType, setFlowType] = useState(
    searchParams.has("flow") && !isThirdPartyConflict ? "initializeFlow" :
      isThirdPartyCallback ? "thirdPartyCallback" : "login"
  );
  const [flows, setFlows] = useState({});
  const [loggingOut, setLoggingOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState(undefined);
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [redirect, setRedirect] = useState(undefined);
  const formRef = useRef();

  const loginSettings = pocketStore.pocket.metadata?.login?.settings || {};

  useEffect(() => {
    rootStore.InitializeOryClient();
  }, []);

  useEffect(() => {
    if(!rootStore.oryClient) { return; }

    setErrorMessage(undefined);
    setStatusMessage(undefined);

    const existingFlow = flows[flowType];

    if(existingFlow) { return; }

    switch(flowType) {
      case "initializeFlow":
        // Recovery flow - try and submit code
        if(location.pathname.endsWith("/register") && !flows.recovery) {
          SubmitRecoveryCode({flows, setFlows, setFlowType, setErrorMessage})
            .then(success => {
              if(success) {
                setTimeout(() => setStatusMessage(rootStore.l10n.login.ory.messages.set_password), 100);
              } else {
                rootStore.SignOut({reload: false});
              }
            });
        }

        break;
      case "thirdPartyCallback":
        if(rootStore.authenticating) { return; }

        rootStore.AuthenticateOry({
          userData,
          origin,
          nonce,
          installId,
          sendWelcomeEmail: true
        })
          .catch(error => {
            rootStore.Log(error, true);

            if(error.login_limited) {
              setFlows({...flows, login_limited: {}});
              setFlowType("login_limited");
            }
          })
          .then(() => {
            if(rootStore.signedIn && next) {
              setRedirect(next);
            }
          });

        break;
      case "login":
        const returnUrl = new URL(location.href);
        returnUrl.pathname = "/oidc";

        if(!location.pathname.endsWith("login")) {
          returnUrl.searchParams.set("next", location.pathname);
        }

        returnUrl.searchParams.set("pid", pocketSlugOrId);

        if(searchParams.has("flow")) {
          rootStore.oryClient.getLoginFlow({id: searchParams.get("flow")})
            .then(({data}) => setFlows({...flows, [flowType]: data}));
        } else {
          rootStore.oryClient.createBrowserLoginFlow({refresh: true, returnTo: returnUrl.toString()})
            .then(({data}) => setFlows({...flows, [flowType]: data}));
        }
        break;
      case "registration":
        rootStore.oryClient.createBrowserRegistrationFlow({returnTo: window.location.origin})
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
      case "settings":
        rootStore.oryClient.createBrowserSettingsFlow()
          .then(({data}) => setFlows({...flows, [flowType]: data}));
        break;
    }
  }, [rootStore.oryClient, flowType]);

  if(redirect) {
    return <Redirect to={redirect} />;
  }

  const LogOut = async () => {
    try {
      setLoggingOut(true);
      const response = await rootStore.oryClient.createBrowserLogoutFlow();
      await rootStore.oryClient.updateLogoutFlow({token: response.data.logout_token});
      setFlows({});
      setFlowType("reset");
      setTimeout(() => setFlowType("login"), 250);
    } catch(error) {
      rootStore.Log(error);
    } finally {
      setLoggingOut(false);
    }
  };

  const flow = flows[flowType];

  if(!flow || loading || loggingOut) {
    return (
      <div className={S("form-container", "form-container--loader")}>
        <Loader />
      </div>
    );
  }

  let title;
  let additionalContent = [];
  if(flowType === "login") {
    if(flow.refresh) {
      title = rootStore.l10n.login.ory.refresh;
    } else if(flow.requested_aal === "aal2") {
      title = rootStore.l10n.login.ory.aal2;
    } else {
      title = rootStore.l10n.login.sign_in;
    }

    if(!flow.refresh && flow.requested_aal !== "aal2") {
      if(!isThirdPartyConflict && !loginSettings?.disable_registration) {
        additionalContent.push(
          <Button
            key="registration-link"
            onClick={() => setFlowType("registration")}
            className={S("button", "button--secondary")}
          >
            {rootStore.l10n.login.ory.actions.registration}
          </Button>
        );
      }

      if(!isThirdPartyConflict) {
        additionalContent.push(
          <button
            key="recovery-link"
            onClick={() => {
              setFlows({...flows, recovery_email: {}});
              setFlowType("recovery_email");
              setTimeout(() => setStatusMessage(rootStore.l10n.login.ory.messages.recovery_prompt), 100);
            }}
            className={S("text-button")}
          >
            {rootStore.l10n.login.ory.actions.recovery}
          </button>
        );
      }

      if(isThirdPartyConflict) {
        additionalContent.push(
          <button
            key="recovery-link"
            onClick={() => {
              const returnUrl = new URL(window.location.origin);
              returnUrl.pathname = sessionStorage.getItem("return_to");
              sessionStorage.removeItem("pid");
              rootStore.SignOut({returnUrl: returnUrl.toString()});
            }}
            className={S("text-button")}
          >
            {rootStore.l10n.login.ory.actions.sign_out}
          </button>
        );
      }
    } else {
      additionalContent.push(
        <button key="sign-out-link" onClick={LogOut} className={S("text-button")}>
          {rootStore.l10n.login.sign_out}
        </button>
      );
    }
  } else if(flowType === "registration") {
    title = rootStore.l10n.login.ory.registration;

    additionalContent.push(
      <button
        key="back-link"
        onClick={() => {
          setFlowType("login");
        }}
        className={S("text-button")}
      >
        {rootStore.l10n.login.ory.actions.back_to_sign_in}
      </button>
    );
  } else if(["recovery", "recovery_code"].includes(flowType)) {
    title = rootStore.l10n.login.ory.recovery;

    additionalContent.push(
      <button
        key="back-link"
        onClick={() => {
          setFlowType("login");
          setFlows({
            ...flows,
            recovery: undefined
          });
        }}
        className={S("text-button")}
      >
        {rootStore.l10n.login.ory.actions.back_to_sign_in}
      </button>
    );
  } else if(flowType === "settings") {
    title = rootStore.l10n.login.ory.update_password;
  }

  const OrySubmit = async (event, additionalData={}) => {
    event.preventDefault();
    setErrorMessage(undefined);
    setStatusMessage(undefined);

    if(requiredOptionsMissing) {
      setErrorMessage(rootStore.l10n.login.errors.missing_required_options);
      return;
    }

    try {
      if(additionalData.thirdParty) {
        sessionStorage.setItem("pid", pocketSlugOrId);
        sessionStorage.setItem("return_to", window.location.pathname);

        if(searchParams.get("elvid")) {
          sessionStorage.setItem("elvid", searchParams.get("elvid"));
        }

        try {
          await rootStore.oryClient.updateLoginFlow({
            flow: flow.id,
            updateLoginFlowBody: {
              provider: additionalData.provider,
              redirect_uri: window.location.href,
              return_to: window.location.href
            }
          });
          return;
        } catch(error) {
          if(error.status === 422) {
            // Save user data in session storage
            sessionStorage.setItem("user-data", JSON.stringify(userData || {}));

            // Redirect
            window.location.href = error.response.data.redirect_browser_to;
          } else {
            throw error;
          }
        }

        return;
      }

      const formData = new FormData(formRef.current);
      const body = { ...Object.fromEntries(formData), ...additionalData };

      let response;

      const email = body.email || body.identifier || body["traits.email"];

      if(email && !ValidEmail(email)) {
        setErrorMessage(rootStore.l10n.login.ory.errors.invalid_email);
        return;
      }

      if("password_confirmation" in body && body.password !== body.password_confirmation) {
        setErrorMessage(rootStore.l10n.login.ory.errors.invalid_password_confirmation);
        return;
      }

      let next = false;
      let nextPath = searchParams.get("next") || (isThirdPartyConflict && sessionStorage.getItem("return_to"));
      switch(flowType) {
        case "login":
          await rootStore.oryClient.updateLoginFlow({flow: flow.id, updateLoginFlowBody: body});
          await rootStore.AuthenticateOry({userData, nonce, installId, origin});
          next = true;

          break;
        case "login_limited":
          await rootStore.AuthenticateOry({userData, nonce, installId, origin, force: true});
          next = true;

          break;
        case "registration":
          await rootStore.oryClient.updateRegistrationFlow({flow: flow.id, updateRegistrationFlowBody: body});
          await rootStore.AuthenticateOry({userData, nonce, installId, origin, sendWelcomeEmail: true, sendVerificationEmail: true});
          next = true;

          break;

        case "recovery_email":
          const flowInfo = await rootStore.SendLoginEmail({type: "reset_password", email: body.email, pocketSlugOrId});
          response = await rootStore.oryClient.getRecoveryFlow({id: flowInfo.flow});
          setFlows({...flows, recovery: response.data});
          setFlowType("recovery");
          setTimeout(() => setStatusMessage(rootStore.l10n.login.ory.messages.recovery_code_prompt), 100);

          break;
        case "recovery":
          response = await rootStore.oryClient.updateRecoveryFlow({flow: flow.id, updateRecoveryFlowBody: body});
          setFlows({...flows, [flowType]: response.data});

          if(response.data.state === "passed_challenge") {
            setFlowType("settings");
          }

          break;
        case "settings":
          response = await rootStore.oryClient.updateSettingsFlow({flow: flow.id, updateSettingsFlowBody: body});

          if(response.data.state === "success") {
            setStatusMessage(rootStore.l10n.login.ory.messages.password_updated);
            await rootStore.AuthenticateOry({userData, nonce, installId, origin, sendVerificationEmail: location.pathname.endsWith("/register")});
          }

          setFlows({...flows, [flowType]: response.data});
          next = true;
          break;
      }

      if(next && nextPath) {
        setRedirect(nextPath);
      }
    } catch(error) {
      console.error(error);

      if(error.login_limited) {
        setFlows({...flows, login_limited: {}});
        setFlowType("login_limited");
        return;
      }

      const errors = error?.response?.data?.ui?.messages
        ?.map(message => message.text)
        ?.filter(message => message)
        ?.join("\n");

      if(errors) {
        setErrorMessage(errors);
        return;
      }

      const fieldErrors = error.response?.data?.ui?.nodes
        ?.map(node =>
          node.messages
            ?.filter(message => message.type === "error")
            ?.map(message => message.text)
            ?.join("\n")
        )
        ?.filter(message => message)
        ?.join("\n");

      if(fieldErrors) {
        setErrorMessage(fieldErrors);
        return;
      }

      if(error?.response?.status === 400) {
        switch(flowType) {
          case "login":
            setErrorMessage(rootStore.l10n.login.ory.errors.invalid_credentials);
            break;
          case "registration":
            setErrorMessage(rootStore.l10n.login.ory.errors.invalid_credentials);
            break;
          case "recovery":
            setErrorMessage(rootStore.l10n.login.ory.errors.invalid_verification_code);
            break;
        }
      }
    }
  };

  const messages = [
    ...(flow?.ui?.messages || [])
      .map(message => {
        switch(message.id) {
          case 1010016:
            const email = flow.ui.nodes.find(node => node.attributes.name === "identifier")?.attributes.value;
            message.text = LocalizeString(rootStore.l10n.login.ory.messages.third_party_conflict, {email});
            break;
        }

        return message;
      }),
    statusMessage
  ].filter(m => m);

  const enableThirdPartyLogin = !loginSettings?.disable_third_party_login;
  const showGoogleLogin = !isThirdPartyConflict && enableThirdPartyLogin && !!flow?.ui?.nodes?.find(node => node.group === "oidc" && node.attributes?.value === "google");
  const showAppleLogin = !isThirdPartyConflict && enableThirdPartyLogin && !!flow?.ui?.nodes?.find(node => node.group === "oidc" && node.attributes?.value === "apple");

  return (
    <MantineProvider defaultColorScheme="dark" withCssVariables>
      <div className={S("form-container")}>
        <form
          title={title}
          key={`form-${flowType}-${flow.state}`}
          ref={formRef}
          className={S("form")}
        >
          {
            messages.map(message =>
              <div key={`message-${message.id || message}`} className={S("message")}>{ message.text || message }</div>
            )
          }
          {
            flowType === "login_limited" ?
              <LoginLimitedForm Submit={OrySubmit} Cancel={LogOut} /> :
              flowType === "recovery_email" ?
                <ForgotPasswordForm OrySubmit={OrySubmit} Cancel={() => setFlowType("login")} /> :
              flowType === "settings" ?
                <PasswordResetForm nodes={flow.ui.nodes} OrySubmit={OrySubmit} /> :
                flow.ui.nodes.map(node => {
                  let attributes = {
                    ...node.attributes
                  };
                  const nodeType = attributes.type === "submit" ? "submit" : attributes.node_type;
                  delete attributes.node_type;

                  let label = attributes.title || node.meta?.label?.text || attributes.label || node.attributes.name;
                  if(["identifier", "traits.email"].includes(attributes.name) && attributes.type !== "hidden") {
                    label = "Email";
                    attributes.type = "email";
                    delete attributes.value;
                  }

                  if(attributes.autocomplete) {
                    attributes.autoComplete = attributes.autocomplete;
                    delete attributes.autocomplete;
                  }

                  attributes.placeholder = label;
                  const key = node?.meta?.label?.id || attributes.name;

                  // 'Send sign in code' buttons?
                  if([1040006, 1010015].includes(node?.meta?.label?.id)) {
                    return null;
                  }

                  if(node.group === "oidc") {
                    // Third party sign in button
                    return null;
                  }

                  if(nodeType === "submit" && attributes.value) {
                    // recovery code resend button
                    if(
                      node.meta.label?.id === 1070007 ||
                      node.meta.label?.id === 1070008
                    ) {
                      attributes.formNoValidate = true;

                      return [
                        <button
                          onClick={async event => await OrySubmit(event, {email: attributes.value})}
                          key={`button-${key}`}
                          formNoValidate
                          type="submit"
                          className={S("text-button")}
                        >
                          { node.meta.label.text }
                        </button>
                      ];
                    }

                    if(node.meta?.label?.id === 1010022) {
                      node.meta.label.text = rootStore.l10n.login.sign_in;
                    }

                    return [
                      <input
                        key={`input-${key}`}
                        {...attributes}
                        type="hidden"
                      />,
                      <Button
                        onClick={OrySubmit}
                        key={`button-${attributes.name}`}
                        type="submit"
                        action={false}
                        className={S("button", "button--primary")}
                      >
                        { node.meta.label.text }
                      </Button>
                    ];
                  }

                  switch(nodeType) {
                    case "button":
                    case "submit":
                      return (
                        <button key={`button-${key}`} {...attributes}>
                          { node.meta.label.text }
                        </button>
                      );
                    default:
                      if(attributes.type === "password") {
                        return (
                          <PasswordInput
                            key={`input-${key}`}
                            {...attributes}
                            classNames={{
                              root: S("login-input__input-container"),
                              wrapper: S("login-input__wrapper"),
                              input: S("login-input__input"),
                              innerInput: S("login-input__input", "login-input__input--password"),
                              visibilityToggle: S("login-input__visibility-toggle")
                            }}
                          />
                        );
                      }

                      return (
                        <TextInput
                          key={`inputs-${key}`}
                          {...attributes}
                          classNames={{
                            root: S("login-input__input-container"),
                            wrapper: S("login-input__wrapper"),
                            input: S("login-input__input"),
                            visibilityToggle: S("login-input__visibility-toggle")
                          }}
                        />
                      );
                  }
                })
          }
          { errorMessage ? <div className={S("message")}>{ errorMessage }</div> : null }
          { additionalContent }
          {
            flowType !== "login" || !(showGoogleLogin || showAppleLogin) ? null :
              <>
                <div className={S("separator")} />
                {
                  !showGoogleLogin ? null :
                    <Button
                      disabled={requiredOptionsMissing}
                      action={false}
                      onClick={async event => await OrySubmit(event, {thirdParty: true, provider: "google"})}
                      title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
                      className={S("button", "button--google")}
                    >
                      <img alt="Google Logo" src={GoogleLogo} className={S("button__icon")} />
                      Sign In with Google
                    </Button>
                }
                  {
                  !showAppleLogin ? null :
                    <Button
                      disabled={requiredOptionsMissing}
                      action={false}
                      onClick={async event => await OrySubmit(event, {thirdParty: true, provider: "apple"})}
                      title={requiredOptionsMissing ? rootStore.l10n.login.errors.missing_required_options : undefined}
                      className={S("button", "button--apple")}
                    >
                      <img alt="Apple Logo" src={AppleLogo} className={S("button__icon")} />
                      Sign In with Apple
                    </Button>
                }
              </>
          }
          <img alt="Powered by Eluvio" src={PoweredByLogo} className={S("powered-by-logo")} />
        </form>
      </div>
    </MantineProvider>
  );
});

const Login = observer(() => {
  const [controls, setControls] = useState({});

  useEffect(() => {
    if(!controls.Show) { return; }

    controls.Show();
  }, [controls]);

  const backgroundKey = pocketStore.mobile && !pocketStore.mobileLandscape && pocketStore.pocket?.metadata?.login?.styling?.background_image_mobile ?
    "background_image_mobile" :
    "background_image_desktop";

  const hasBackground = pocketStore.pocket?.metadata?.login?.styling?.[backgroundKey];

  return (
    <Modal
      backgroundUrl={hasBackground && pocketStore.pocket.metadata.login.styling[backgroundKey]?.url}
      backgroundHash={hasBackground && pocketStore.pocket.metadata.login.styling[`${backgroundKey}_hash`]}
      SetMenuControls={setControls}
      closable={false}
    >
      <div className={S("login")}>
        {
          !pocketStore.pocket.metadata?.login?.styling?.logo ? null :
            <HashedLoaderImage
              width={400}
              hideHashedImage
              src={pocketStore.pocket.metadata.login.styling.logo.url}
              hash={pocketStore.pocket.metadata.login.styling.logo_hash}
              className={S("logo__image")}
            />
        }
        <div className={S("content")}>
          <OryLogin />
        </div>
      </div>
    </Modal>
  );
});

export default Login;
