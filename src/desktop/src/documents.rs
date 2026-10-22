use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Mutex},
};

const MAX_ID: u64 = 9_007_199_254_740_991;

#[derive(Default)]
pub struct Document {
    pub path: Option<PathBuf>,
    pub baseline: Vec<u8>,
    pub uncertain: bool,
    pub generation: u64,
}

pub struct Documents {
    next: u64,
    entries: HashMap<u64, Arc<Mutex<Document>>>,
}

impl Default for Documents {
    fn default() -> Self {
        Self {
            next: 0,
            entries: HashMap::from([(0, Arc::new(Mutex::new(Document::default())))]),
        }
    }
}

impl Documents {
    pub fn create(&mut self) -> Result<u64, String> {
        if self.next >= MAX_ID {
            return Err("Document ID limit reached.".into());
        }
        self.next += 1;
        self.entries
            .insert(self.next, Arc::new(Mutex::new(Document::default())));
        Ok(self.next)
    }
    pub fn get(&self, id: Option<u64>) -> Result<Arc<Mutex<Document>>, String> {
        // Only old calls without an ID select the initial document.
        self.entries
            .get(&id.unwrap_or(0))
            .cloned()
            .ok_or("This document is no longer open.".into())
    }
    #[cfg(test)]
    pub fn retire(&mut self, id: u64) -> Result<(), String> {
        self.retire_with(id, || Ok(()))
    }
    pub fn retire_with(
        &mut self,
        id: u64,
        confirm: impl FnOnce() -> Result<(), String>,
    ) -> Result<(), String> {
        let slot = self.get(Some(id))?;
        let doc = slot.lock().map_err(|error| error.to_string())?;
        if doc.uncertain {
            return Err("Check the last save before you close this document.".into());
        }
        confirm()?;
        self.entries.remove(&id);
        Ok(())
    }
    pub fn uncertain(&self) -> Result<bool, String> {
        for slot in self.entries.values() {
            if slot.lock().map_err(|error| error.to_string())?.uncertain {
                return Ok(true);
            }
        }
        Ok(false)
    }
    pub fn ids(&self) -> Vec<u64> {
        let mut ids: Vec<_> = self.entries.keys().copied().collect();
        ids.sort_unstable();
        ids
    }
}

// Lock order is registry, then document. Drop the registry lock before disk
// work. No action may acquire the registry while it holds a document lock.
pub fn with_document<T>(
    host: &Mutex<Documents>,
    id: Option<u64>,
    action: impl FnOnce(&mut Document) -> Result<T, String>,
) -> Result<T, String> {
    let registry = host.lock().map_err(|error| error.to_string())?;
    let slot = registry.get(id)?;
    let mut doc = slot.lock().map_err(|error| error.to_string())?;
    drop(registry);
    action(&mut doc)
}

pub fn current(host: &Mutex<Documents>, id: Option<u64>, generation: u64) -> Result<(), String> {
    with_document(host, id, |doc| {
        if doc.generation != generation {
            return Err("The document changed. Repeat the command.".into());
        }
        Ok(())
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ids_are_not_reused_and_missing_ids_never_select_another_document() {
        let mut registry = Documents::default();
        let first = registry.create().unwrap();
        registry.retire(first).unwrap();
        let second = registry.create().unwrap();
        assert!(second > first);
        assert!(registry.get(Some(first)).is_err());
        assert!(registry.get(Some(MAX_ID)).is_err());
        assert!(registry.get(None).is_ok());
        registry.retire(0).unwrap();
        assert!(registry.get(None).is_err());
        registry.next = MAX_ID;
        assert!(registry.create().is_err());
        assert!(registry.get(Some(second)).is_ok());
    }
    #[test]
    fn uncertainty_in_any_document_blocks_retirement_and_quit() {
        let mut registry = Documents::default();
        let id = registry.create().unwrap();
        registry.get(Some(id)).unwrap().lock().unwrap().uncertain = true;
        assert!(registry.uncertain().unwrap());
        assert!(registry.retire(id).is_err());
        registry.get(Some(id)).unwrap().lock().unwrap().uncertain = false;
        registry.retire(id).unwrap();
        assert!(!registry.uncertain().unwrap());
    }
    #[test]
    fn async_completion_checks_its_own_identity_and_generation() {
        let host = Mutex::new(Documents::default());
        let id = host.lock().unwrap().create().unwrap();
        with_document(&host, None, |doc| {
            doc.generation = 1;
            Ok(())
        })
        .unwrap();
        assert!(current(&host, Some(id), 0).is_ok());
        assert!(current(&host, None, 0).is_err());
        host.lock().unwrap().retire(id).unwrap();
        assert!(current(&host, Some(id), 0).is_err());
        let other = host.lock().unwrap().create().unwrap();
        assert!(current(&host, Some(other), 0).is_ok());
        assert!(current(&host, Some(id), 0).is_err());
    }
    #[test]
    fn disk_work_does_not_hold_the_registry_lock() {
        let host = Mutex::new(Documents::default());
        with_document(&host, None, |_| {
            assert!(host.try_lock().is_ok());
            Ok(())
        })
        .unwrap();
    }
}
