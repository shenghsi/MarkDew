const MAX_TOKEN: u64 = 9_007_199_254_740_991;

#[derive(Default)]
pub struct Gate {
    next: u64,
    pending: Option<u64>,
    grant: bool,
}

impl Gate {
    fn allocate(&mut self) -> Result<u64, String> {
        if self.next >= MAX_TOKEN {
            return Err("Quit request limit reached. Keep the window open.".into());
        }
        self.next += 1;
        Ok(self.next)
    }
    pub fn request(&mut self) -> Result<Option<u64>, String> {
        if self.pending.is_some() || self.grant {
            return Ok(None);
        }
        let token = self.allocate()?;
        self.pending = Some(token);
        Ok(Some(token))
    }
    pub fn ready(&mut self) -> Result<Option<u64>, String> {
        if self.pending.is_none() && !self.grant {
            return Ok(None);
        }
        self.grant = false;
        self.pending = None;
        let token = self.allocate()?;
        self.pending = Some(token);
        Ok(Some(token))
    }
    pub fn resolve(&mut self, token: u64, allow: bool) -> Result<(), String> {
        if self.pending != Some(token) {
            return Err("This Quit request is no longer current.".into());
        }
        self.pending = None;
        self.grant = allow;
        Ok(())
    }
    pub fn confirm(&mut self, token: u64, allow: bool, uncertain: bool) -> Result<(), String> {
        if allow && uncertain {
            return Err("Check the last save before Quit.".into());
        }
        self.resolve(token, allow)
    }
    pub fn consume(&mut self, code: Option<i32>) -> bool {
        if self.grant && code == Some(0) {
            self.grant = false;
            true
        } else {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn repeated_requests_cancel_and_retry_have_distinct_tokens() {
        let mut gate = Gate::default();
        let first = gate.request().unwrap().unwrap();
        assert_eq!(gate.request().unwrap(), None);
        gate.resolve(first, false).unwrap();
        assert!(!gate.consume(Some(0)));
        let second = gate.request().unwrap().unwrap();
        assert_ne!(first, second);
        assert!(gate.resolve(first, true).is_err());
        gate.resolve(second, true).unwrap();
        assert!(!gate.consume(None));
        assert!(!gate.consume(Some(1)));
        assert_eq!(gate.request().unwrap(), None);
        assert!(gate.consume(Some(0)));
        assert!(!gate.consume(Some(0)));
    }
    #[test]
    fn renderer_registration_invalidates_old_approval_and_cancel() {
        let mut gate = Gate::default();
        let old = gate.request().unwrap().unwrap();
        let current = gate.ready().unwrap().unwrap();
        assert_ne!(old, current);
        assert!(gate.resolve(old, true).is_err());
        assert!(gate.resolve(old, false).is_err());
        gate.resolve(current, true).unwrap();
        let restarted = gate.ready().unwrap().unwrap();
        assert!(!gate.consume(Some(0)));
        assert!(gate.resolve(current, true).is_err());
        gate.resolve(restarted, false).unwrap();
        assert_eq!(gate.ready().unwrap(), None);
    }
    #[test]
    fn uncertain_save_and_token_exhaustion_never_grant_exit() {
        let mut gate = Gate::default();
        let request = gate.request().unwrap().unwrap();
        assert!(gate.confirm(request, true, true).is_err());
        assert!(!gate.consume(Some(0)));
        gate.confirm(request, false, true).unwrap();
        let request = gate.request().unwrap().unwrap();
        gate.confirm(request, true, false).unwrap();
        gate.next = MAX_TOKEN;
        assert!(gate.ready().is_err());
        assert!(!gate.consume(Some(0)));
        assert!(gate.request().is_err());
    }
}
